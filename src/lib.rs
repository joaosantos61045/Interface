use serde::{Deserialize, Serialize};
use serde_json;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{console, window, HtmlInputElement, WebSocket, MessageEvent};
use js_sys::Date;
use rand::Rng;
use js_sys::Function;
use wasm_bindgen::JsValue;
// -------------------- Message Structs --------------------

#[derive(Serialize, Deserialize, Debug)]
struct Server2ClientMsg {
    env: String,
    err: Option<String>,
}

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

use std::sync::{Mutex};
use once_cell::sync::Lazy;

static USER_ID: Lazy<i32> = Lazy::new(|| rand::thread_rng().gen::<i32>());
static mut WS_CONNECTED: bool = false;
static mut WS: Option<WebSocket> = None;

static LAST_ENV: Lazy<Mutex<String>> = Lazy::new(|| Mutex::new(String::new()));

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

fn handle_server_message(msg: Server2ClientMsg) {
    if let Some(err) = msg.err {
        alert_error(&err);
    } else {
        *LAST_ENV.lock().unwrap() = msg.env.clone();
        console::log_1(&format!("✅ Env: {}", msg.env).into());
        append_to_console(&format!("<span style='color: lightgreen;'> {}</span>", msg.env));

        // Call JS function `update_environment` with the env string
        if let Ok(global) = js_sys::global().dyn_into::<web_sys::Window>() {
            if let Some(func) = js_sys::Reflect::get(&global, &JsValue::from_str("update_environment"))
                .ok()
                .and_then(|v| v.dyn_into::<Function>().ok())
            {
                let _ = func.call1(&JsValue::NULL, &JsValue::from_str(&msg.env));
            }
        }
    }
}

// -------------------- WebSocket Setup --------------------

fn setup_websocket(url: &str) -> WebSocket {
    unsafe { WS_CONNECTED = true; }

    let ws = WebSocket::new(url).unwrap();
    let ws_clone = ws.clone();

    let on_open_callback = Closure::wrap(Box::new(move || {
        console::log_1(&"WebSocket connection opened".into());
        let init_msg = ClientInitMsg { user_id: *USER_ID };
        let init_msg_json = serde_json::to_string(&init_msg).unwrap();

        match ws_clone.send_with_str(&init_msg_json) {
            Ok(_) => append_to_console("WebSocket connected: Init message sent."),
            Err(err) => append_to_console(&format!("Failed to send init message: {:?}", err)),
        }
    }) as Box<dyn FnMut()>);

    ws.set_onopen(Some(on_open_callback.as_ref().unchecked_ref()));
    on_open_callback.forget();

    ws
}

fn setup_message_handler(ws: &WebSocket) {
    let onmessage_callback = Closure::wrap(Box::new(move |event: MessageEvent| {
        if let Some(received_raw) = event.data().as_string() {
            console::log_1(&format!("Raw message received: {}", received_raw).into());

            if let Ok(received) = serde_json::from_str::<Server2ClientMsg>(&received_raw) {
                handle_server_message(received);
            } else {
                //console::log_1(&format!("Plain text message received: {}", received_raw).into());
                append_to_console(&format!("<span style='color: lightgreen;'> {}</span>", received_raw));
            }
        } else {
            console::log_1(&"Received non-string message".into());
            append_to_console("<span style='color: gray;'>Received non-string message</span>");
        }
    }) as Box<dyn FnMut(MessageEvent)>);

    ws.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
    onmessage_callback.forget();
}

fn setup_send_message(ws: &WebSocket) {
    let ws_clone = ws.clone();
    let document = window().unwrap().document().unwrap();
    let send_button = document.get_element_by_id("send_button").unwrap();
    let user_input_element = document.get_element_by_id("user_input").unwrap()
        .dyn_into::<HtmlInputElement>().unwrap();

    let closure = Closure::wrap(Box::new(move || {
        let input = user_input_element.value();
        if input.trim().is_empty() {
            return;
        }
        let timestamp = Date::now() as u128;
        let send_msg = Client2ServerMsg {
            input: input.clone(),
            user_id: *USER_ID,
            timestamp,
        };

        let send_msg_json = serde_json::to_string(&send_msg).unwrap();
        let _ = ws_clone.send_with_str(&send_msg_json);
        append_to_console(&format!("Sent: {}", input));
        user_input_element.set_value("");
    }) as Box<dyn Fn()>);

    send_button.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref()).unwrap();
    closure.forget();
    console::log_1(&"Send message setup done.".into());
}



#[wasm_bindgen]
pub fn get_env() -> String {
    LAST_ENV.lock().unwrap().clone()
}
#[wasm_bindgen]
pub fn send_message_to_server(message: &str) {
    unsafe {
        if let Some(ws) = &WS {
            console::log_1(&format!("Sending message: {}", message).into());
            let timestamp = Date::now() as u128;
            let send_msg = Client2ServerMsg {
                input: message.to_string(),
                user_id: *USER_ID,
                timestamp,
            };

            let send_msg_json = serde_json::to_string(&send_msg).unwrap();
            let _ = ws.send_with_str(&send_msg_json);
            append_to_console(&format!("Sent: {}", message));
        } else {
            alert("WebSocket is not connected. Message not sent.");
        }
    }
}

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

fn alert_error(error_message: &str) {
    alert(&format!("❌ Error: {}", error_message));
}

#[wasm_bindgen(start)]
pub async fn main() -> Result<(), JsValue> {
    unsafe {
        if WS.is_some() {
            console::log_1(&"WebSocket is already connected.".into());
            return Ok(());
        }
    }

    let url = format!("ws://127.0.0.1:2025");
    console::log_1(&format!("Connecting to: {}", url).into());

    let ws = setup_websocket(&url);
    setup_message_handler(&ws);
    setup_send_message(&ws);

    unsafe {
        WS = Some(ws);
        WS_CONNECTED = true;
    }

    Ok(())
}
