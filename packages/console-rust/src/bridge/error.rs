use iii_sdk::BridgeError;
use serde_json::{json, Value};

/// Maps a BridgeError to an HTTP response format
pub fn error_response(error: BridgeError) -> Value {
    let (status_code, message) = match error {
        BridgeError::NotConnected => (503, "Bridge is not connected".to_string()),
        BridgeError::Timeout => (504, "Invocation timed out".to_string()),
        BridgeError::Remote { code, message } => {
            (502, format!("Remote error ({}): {}", code, message))
        }
        BridgeError::Handler(msg) => (500, format!("Handler error: {}", msg)),
        BridgeError::Serde(msg) => (500, format!("Serialization error: {}", msg)),
        BridgeError::WebSocket(msg) => (503, format!("WebSocket error: {}", msg)),
    };

    json!({
        "status_code": status_code,
        "headers": [],
        "body": {
            "error": message
        }
    })
}

/// Wraps a successful response in the standard HTTP response format
pub fn success_response(body: Value) -> Value {
    json!({
        "status_code": 200,
        "headers": [],
        "body": body
    })
}
