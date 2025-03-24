use serde::{Deserialize, Serialize};
use serde_json;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{console, window, HtmlInputElement, WebSocket, MessageEvent};
use js_sys::Date;
use rand::Rng;
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

use std::sync::LazyLock;

static USER_ID: LazyLock<i32> = LazyLock::new(|| rand::thread_rng().gen::<i32>());
static mut WS_CONNECTED: bool = false;
static mut WS: Option<WebSocket> = None;

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

fn setup_websocket(url: &str) -> WebSocket {
    unsafe { WS_CONNECTED = true; } // Prevent duplicate connection attempts
    
    let ws = WebSocket::new(url).unwrap();
    let ws_clone = ws.clone();

    let on_open_callback = Closure::wrap(Box::new(move || {
        console::log_1(&"WebSocket connection opened".into());
        let init_msg = ClientInitMsg { user_id: *USER_ID };
        let init_msg_json = serde_json::to_string(&init_msg).unwrap();

        match ws_clone.send_with_str(&init_msg_json) {
            Ok(_) => {
                console::log_1(&"WebSocket connected: Init message sent.".into());
                append_to_console("WebSocket connected: Init message sent.");
            },
            Err(err) => {
                console::log_1(&format!("Failed to send init message: {:?}", err).into());
                append_to_console(&format!("Failed to send init message: {:?}", err));
            },
        }
    }) as Box<dyn FnMut()>);

    ws.set_onopen(Some(on_open_callback.as_ref().unchecked_ref()));
    on_open_callback.forget();

    ws
}

fn setup_message_handler(ws: &WebSocket) {
    let ws_clone = ws.clone();
    let onmessage_callback = Closure::wrap(Box::new(move |event: MessageEvent| {
        if let Some(received_raw) = event.data().as_string() {
            console::log_1(&format!("Raw message received: {}", received_raw).into());
            
            if let Ok(received) = serde_json::from_str::<Server2ClientMsg>(&received_raw) {
                if let Some(err) = received.err {
                    console::log_1(&format!("Error: {}", err).into());
                    append_to_console(&format!("<span style='color: red; font-weight: bold;'>❌ {}</span>", err));
                }
                
                console::log_1(&format!("Environment: {}", received.env).into());
                append_to_console(&format!("<span style='color: lightgreen;'> {}</span>", received.env));
            } else {
                // Handle as plain text message
                console::log_1(&format!("Plain text message received: {}", received_raw).into());
                append_to_console(&format!("<span style='color: lightgreen;'> {}</span>", received_raw));
            }
        } else {
            console::log_1(&"Received non-string message".into());
            append_to_console("<span style='color: gray;'>Received non-string message</span>");
        }
    }) as Box<dyn FnMut(MessageEvent)>);

    ws_clone.set_onmessage(Some(onmessage_callback.as_ref().unchecked_ref()));
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
