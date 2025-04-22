use serde::{Deserialize, Serialize};
use serde_json;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{console, window, HtmlInputElement, WebSocket, MessageEvent};
use js_sys::Date;
use rand::Rng;
use js_sys::Function;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::spawn_local;
use web_sys::{ RequestInit, RequestMode, Response};
use js_sys::Promise;
use gloo_net::http::Request;
use serde_json::json;
use reqwest::{Client, StatusCode};
use reqwest::header::{COOKIE, HeaderMap};
use std::collections::HashMap;
// -------------------- Message Structs --------------------


#[derive(Debug, Serialize, Deserialize)]
pub struct VariableInfo {
    pub name: String,
    pub originalInput: String,
    pub exp: String,
    pub keyword: String,
    pub import: String,
    pub operation: String,
    pub hoisted: String,
    pub r#type: String,
    pub val: String,
    pub namespace: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Server2ClientMsg(pub HashMap<String, VariableInfo>);

#[derive(Serialize, Deserialize, Debug)]
struct Client2ServerMsg {
    input: String,
    user_id: i32,
    timestamp: u128,
}

#[derive(Serialize, Deserialize, Debug)]
struct ClientInitMsg {
    user_id: i32,
}

// -------------------- Static State --------------------


use once_cell::sync::Lazy;

static USER_ID: Lazy<i32> = Lazy::new(|| rand::thread_rng().gen::<i32>());
static mut WS_CONNECTED: bool = false;
static mut WS: Option<WebSocket> = None;
static mut NAMESPACE: Option<String> = None;


// -------------------- Utility --------------------

fn get_input_value(id: &str) -> Option<String> {
    let document = window().unwrap().document().unwrap();
    let input_element = document.get_element_by_id(id)?;
    let input_element = input_element.dyn_into::<HtmlInputElement>().ok()?;
    Some(input_element.value())
}

fn append_to_console(message: &str) {
    let document = window().unwrap().document().unwrap();
    let console_element = document.get_element_by_id("console").unwrap();
    let new_message = document.create_element("div").unwrap();
    new_message.set_inner_html(message);
    console_element.append_child(&new_message).unwrap();
}

// -------------------- Server Message Handler --------------------

fn handle_server_message(json: String) {
    // Send the parsed environment JSON directly to the JS function
    if let Ok(global) = js_sys::global().dyn_into::<web_sys::Window>() {
        if let Some(func) = js_sys::Reflect::get(&global, &JsValue::from_str("update_environment"))
            .ok()
            .and_then(|v| v.dyn_into::<Function>().ok())
        {
            let _ = func.call1(&JsValue::NULL, &JsValue::from_str(&json));
        }
    }
}




// -------------------- WebSocket Setup --------------------

pub fn setup_websocket_with_namespace(base_url: String) {
    spawn_local(async move {
        
        // Establish WebSocket connection
        let ws_url = format!("{}/ws", base_url);
        let ws = match WebSocket::new(&ws_url) {
            Ok(socket) => socket,
            Err(err) => {
                append_to_console(&format!("WebSocket error: {:?}", err));
                return;
            }
        };
        let ws_clone = ws.clone();
        let namespace_clone = "A7pX2"; //  Needed inside closure

        // STEP 4: Send the subscription JSON message on open
        let on_open = Closure::wrap(Box::new(move || {
            console::log_1(&"WebSocket connection opened".into());

            let json_msg = json!({
                "namespace": namespace_clone,
                "subscribe": "all"
            })
            .to_string();

            match ws_clone.send_with_str(&json_msg) {
                Ok(_) => append_to_console("Namespace subscription message sent."),
                Err(err) => append_to_console(&format!("Failed to send: {:?}", err)),
            }

            setup_message_handler(&ws_clone);
            setup_send_message(&ws_clone);

            unsafe {
                WS = Some(ws_clone.clone());
                WS_CONNECTED = true;
                NAMESPACE = Some(namespace_clone.to_string());
            }
        }) as Box<dyn FnMut()>);

        ws.set_onopen(Some(on_open.as_ref().unchecked_ref()));
        on_open.forget();
    });
}


fn setup_message_handler(ws: &WebSocket) {
    let onmessage_callback = Closure::wrap(Box::new(move |event: MessageEvent| {
        if let Some(received_raw) = event.data().as_string() {
            console::log_1(&format!("Raw message received: {}", received_raw).into());

            // Try parsing as structured Server2ClientMsg first
            if let Ok(received) = serde_json::from_str::<Server2ClientMsg>(&received_raw) {
                if let Ok(serialized) = serde_json::to_string(&received) {
                    handle_server_message(serialized);
                } else {
                    append_to_console("Failed to serialize Server2ClientMsg.");
                }

            // If that fails, maybe it's a raw environment map (like for delete)
            } else if let Ok(_env_json) = serde_json::from_str::<serde_json::Value>(&received_raw) {
                // Just forward the raw string to handle_server_message directly
                handle_server_message(received_raw);

            } else {
                append_to_console(&format!(
                    "<span style='color: lightgreen;'> {}</span>",
                    received_raw
                ));
            }
        } else {
            console::log_1(&"Received non-string message".into());
            append_to_console("<span style='color: gray;'>Received non-string message</span>");
        }
    }) as Box<dyn FnMut(MessageEvent)>);

    ws.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
    onmessage_callback.forget();
}


fn setup_send_message(_ws: &WebSocket) {
    let document = window().unwrap().document().unwrap();
    let send_button = document.get_element_by_id("send_button").unwrap();
    let user_input_element = document
        .get_element_by_id("user_input")
        .unwrap()
        .dyn_into::<HtmlInputElement>()
        .unwrap();

    let closure = Closure::wrap(Box::new(move || {
        let input = user_input_element.value();
        if input.trim().is_empty() {
            return;
        }

        let namespace = unsafe { NAMESPACE.clone() };
        if namespace.is_none() {
            append_to_console("Namespace not set.");
            return;
        }

        let namespace = namespace.unwrap();

        let input_display = input.clone(); // For UI
        let input_clone = input.clone(); // For async

        spawn_local(async move {
            let url = format!("http://localhost:8080/app/{}", namespace);
            let form_data = format!("exp={}", js_sys::encode_uri_component(&input_clone));

            let response = match Request::post(&url)
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .header("X-Requested-With", "XMLHttpRequest") 
                .body(form_data)
            {
                Ok(request) => request.send().await,
                Err(err) => {
                    append_to_console(&format!("Failed to create request: {:?}", err));
                    return;
                }
            };

            match response {
                Ok(resp) => {
                    if let Ok(json) = resp.json::<serde_json::Value>().await {
                        if let Some(result) = json.get("result") {
                            append_to_console(&format!("<span style='color: lightgreen;'>Result: {}", result));
                        } else if let Some(error) = json.get("error") {
                            alert_error(error.as_str().unwrap_or("Unknown error"));
                        } else {
                            append_to_console("⚠️ Unknown response format");
                        }
                    } else {
                        append_to_console("Failed to parse JSON response");
                    }
                }
                Err(err) => {
                    append_to_console(&format!("POST failed: {:?}", err));
                }
            }
        });

        user_input_element.set_value("");
        append_to_console(&format!("Sent: {}", input_display));
    }) as Box<dyn Fn()>);

    send_button
        .add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())
        .unwrap();
    closure.forget();
    console::log_1(&"Send message POST setup done.".into());
}






#[wasm_bindgen]
pub fn send_message_to_server(message: &str) {
    let input = message.to_string();

    let namespace = unsafe { NAMESPACE.clone() };
    if namespace.is_none() {
        append_to_console("Namespace not set.");
        return;
    }

    let namespace = namespace.unwrap();
    let input_display = input.clone();
    let input_clone = input.clone();

    spawn_local(async move {
        let url = format!("http://localhost:8080/app/{}", namespace);
        let form_data = format!("exp={}", js_sys::encode_uri_component(&input_clone));

        let response = match Request::post(&url)
            .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
            .header("X-Requested-With", "XMLHttpRequest")
            .body(form_data)
        {
            Ok(request) => request.send().await,
            Err(err) => {
                append_to_console(&format!("Failed to create request: {:?}", err));
                return;
            }
        };

        match response {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(result) = json.get("result") {
                        append_to_console(&format!("<span style='color: lightgreen;'>Result: {}", result));
                    } else if let Some(error) = json.get("error") {
                        alert_error(error.as_str().unwrap_or("Unknown error"));
                    } else {
                        append_to_console("⚠️ Unknown response format");
                    }
                } else {
                    append_to_console("Failed to parse JSON response");
                }
            }
            Err(err) => {
                append_to_console(&format!("POST failed: {:?}", err));
            }
        }
    });

    append_to_console(&format!("Sent: {}", input_display));
}

#[wasm_bindgen]
pub fn perform_action_on_server(action: &str, arg_type: &str, arg_value: &str, env_name: &str, env_value: &str) {
    let action = action.to_string();
    let arg_type = arg_type.to_string();
    let arg_value = arg_value.to_string();
    let env_name = env_name.to_string();
    let env_value = env_value.to_string();

    let namespace = unsafe { NAMESPACE.clone() };
    if namespace.is_none() {
        append_to_console("Namespace not set.");
        return;
    }

    let namespace = namespace.unwrap();
    let url = format!("http://localhost:8080/app/{}", namespace);

    // Construct JSON body
    let data = serde_json::json!({
        "action": action,
        "args": {
            "arg": {
                "type": arg_type,
                "value": arg_value
            }
        },
        "env": {
            env_name: env_value
        }
    });

    let json_body = data.to_string();

    spawn_local(async move {
        let response = match Request::put(&url)
            .header("Content-Type", "application/json")
            .header("X-Requested-With", "XMLHttpRequest")
            .body(json_body)
        {
            Ok(request) => request.send().await,
            Err(err) => {
                append_to_console(&format!("Failed to create PUT request: {:?}", err));
                return;
            }
        };

        match response {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(result) = json.get("result") {
                        append_to_console(&format!("<span style='color: lightblue;'>Action Result: {}</span>", result));
                    } else if let Some(error) = json.get("error") {
                        alert_error(error.as_str().unwrap_or("Unknown error"));
                    } else {
                        append_to_console("⚠️ Unknown response format from action");
                    }
                } else {
                    append_to_console("Failed to parse JSON response");
                }
            }
            Err(err) => {
                append_to_console(&format!("PUT request failed: {:?}", err));
            }
        }
    });

    append_to_console(&format!("🔧 Action sent: {}", action));
}


#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

fn alert_error(error_message: &str) {
    alert(&format!("❌ Error: {}", error_message));
}

#[wasm_bindgen]
pub async fn main() -> Result<(), JsValue> {
    unsafe {
        if WS.is_some() {
            console::log_1(&"WebSocket is already connected.".into());
            return Ok(());
        }
    }

    let base_url = "ws://localhost:8080".to_string();
    console::log_1(&format!("Connecting to: {}", base_url).into());

    // This now handles everything: fetch + websocket + init
    setup_websocket_with_namespace(base_url);

    Ok(())
}

