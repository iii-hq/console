use iii_sdk::III;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::time::Duration;

use crate::bridge::error::{error_response, success_response};

async fn handle_health(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.health.check", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(health_data) => success_response(health_data),
        Err(err) => error_response(err),
    }
}

async fn handle_workers(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.workers.list", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(workers_data) => success_response(workers_data),
        Err(err) => error_response(err),
    }
}

async fn handle_triggers_list(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.triggers.list", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(triggers_data) => success_response(triggers_data),
        Err(err) => error_response(err),
    }
}

async fn handle_functions_list(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.functions.list", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(functions_data) => success_response(functions_data),
        Err(err) => error_response(err),
    }
}

async fn handle_status(bridge: &III) -> Value {
    let (workers_result, functions_result, metrics_result) = tokio::join!(
        bridge.call_with_timeout("engine.workers.list", json!({}), Duration::from_secs(5)),
        bridge.call_with_timeout(
            "engine.functions.list",
            json!({}),
            Duration::from_secs(5)
        ),
        bridge.call_with_timeout("engine.metrics.list", json!({}), Duration::from_secs(5))
    );

    let workers_count = workers_result
        .ok()
        .and_then(|v| v.get("workers").and_then(|w| w.as_array()).map(|arr| arr.len()))
        .unwrap_or(0);

    let functions_count = functions_result
        .ok()
        .and_then(|v| {
            v.get("functions")
                .and_then(|f| f.as_array())
                .map(|arr| arr.len())
        })
        .unwrap_or(0);

    let metrics_available = metrics_result.is_ok();

    success_response(json!({
        "workers": workers_count,
        "functions": functions_count,
        "status": "running",
        "metrics_available": metrics_available
    }))
}

async fn handle_trigger_types(bridge: &III) -> Value {
    let static_types = vec![
        "api",
        "event",
        "subscribe",
        "cron",
        "log",
        "stream::join",
        "stream::leave",
        "state",
        "engine::functions-available",
    ];

    match bridge
        .call_with_timeout("engine.triggers.list", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(triggers_data) => {
            let mut types = HashSet::new();

            for t in &static_types {
                types.insert(t.to_string());
            }

            if let Some(triggers) = triggers_data.get("triggers").and_then(|v| v.as_array()) {
                for trigger in triggers {
                    if let Some(trigger_type) = trigger.get("trigger_type").and_then(|v| v.as_str())
                    {
                        types.insert(trigger_type.to_string());
                    }
                }
            }

            let mut types_vec: Vec<String> = types.into_iter().collect();
            types_vec.sort();

            success_response(json!({ "trigger_types": types_vec }))
        }
        Err(_) => {
            let mut types_vec: Vec<String> = static_types.iter().map(|s| s.to_string()).collect();
            types_vec.sort();
            success_response(json!({ "trigger_types": types_vec }))
        }
    }
}

async fn handle_alerts_list(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.alerts.list", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_sampling_rules(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.sampling.rules", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_otel_logs_list(bridge: &III, input: Value) -> Value {
    let effective_input = input.get("body").cloned().unwrap_or(input);
    match bridge
        .call_with_timeout("engine.logs.list", effective_input, Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_otel_logs_clear(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.logs.clear", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_otel_traces_list(bridge: &III, input: Value) -> Value {
    let effective_input = input.get("body").cloned().unwrap_or(input);
    match bridge
        .call_with_timeout("engine.traces.list", effective_input, Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_otel_traces_clear(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("engine.traces.clear", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_otel_traces_tree(bridge: &III, input: Value) -> Value {
    // Extract trace_id from body wrapper or top-level input
    // API triggers wrap POST body inside a "body" field
    let trace_id = input
        .get("body")
        .and_then(|b| b.get("trace_id"))
        .and_then(|v| v.as_str())
        .or_else(|| input.get("trace_id").and_then(|v| v.as_str()));

    let trace_id = match trace_id {
        Some(id) => id.to_string(),
        None => {
            return error_response(iii_sdk::IIIError::Handler(
                "Missing trace_id in request".to_string(),
            ))
        }
    };

    let tree_input = json!({ "trace_id": trace_id });

    match bridge
        .call_with_timeout("engine.traces.tree", tree_input, Duration::from_secs(10))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_metrics_detailed(bridge: &III, input: Value) -> Value {
    let effective_input = input.get("body").cloned().unwrap_or(input);
    match bridge
        .call_with_timeout("engine.metrics.list", effective_input, Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_rollups_list(bridge: &III, input: Value) -> Value {
    let effective_input = input.get("body").cloned().unwrap_or(input);
    match bridge
        .call_with_timeout("engine.rollups.list", effective_input, Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_state_groups_list(bridge: &III, _input: Value) -> Value {
    // Always use state.list_groups - no filtering by stream_name needed
    match bridge
        .call_with_timeout("state.list_groups", json!({}), Duration::from_secs(5))
        .await
    {
        Ok(data) => {
            if let Some(groups) = data.get("groups").and_then(|g| g.as_array()) {
                let group_objects: Vec<_> = groups
                    .iter()
                    .filter_map(|g| g.as_str())
                    .map(|id| json!({ "id": id, "count": 0 }))
                    .collect();

                success_response(json!({
                    "groups": group_objects,
                    "count": group_objects.len()
                }))
            } else {
                success_response(json!({ "groups": [], "count": 0 }))
            }
        }
        Err(err) => error_response(err),
    }
}

async fn handle_state_group_items(bridge: &III, input: Value) -> Value {
    // Extract group_id from body or top-level input
    let group_id = input
        .get("body")
        .and_then(|b| b.get("group_id"))
        .and_then(|v| v.as_str())
        .or_else(|| input.get("group_id").and_then(|v| v.as_str()));

    match group_id {
        Some(group_id) => {
            let state_input = json!({ "group_id": group_id });

            match bridge
                .call_with_timeout("state.list", state_input, Duration::from_secs(5))
                .await
            {
                Ok(data) => {
                    // state.list returns an array of items directly
                    if let Some(items) = data.as_array() {
                        success_response(json!({
                            "items": items,
                            "count": items.len()
                        }))
                    } else {
                        success_response(json!({
                            "items": [],
                            "count": 0
                        }))
                    }
                }
                Err(err) => error_response(err),
            }
        }
        None => {
            error_response(iii_sdk::IIIError::Handler(
                "Missing group_id in request".to_string(),
            ))
        }
    }
}

async fn handle_state_item_set(bridge: &III, input: Value) -> Value {
    // Extract path parameters (from URL: /states/:group/item)
    let path_params = input.get("path_parameters");
    let body = input.get("body");

    let group_id = path_params
        .and_then(|p| p.get("group"))
        .and_then(|v| v.as_str())
        .or_else(|| input.get("group").and_then(|v| v.as_str()));

    let group_id = match group_id {
        Some(id) => id.to_string(),
        None => {
            return error_response(iii_sdk::IIIError::Handler(
                "Missing group in path parameters".to_string(),
            ))
        }
    };

    // Extract key and value from body
    let item_id = body
        .and_then(|b| b.get("key"))
        .and_then(|v| v.as_str())
        .or_else(|| input.get("key").and_then(|v| v.as_str()));

    let item_id = match item_id {
        Some(id) => id.to_string(),
        None => {
            return error_response(iii_sdk::IIIError::Handler(
                "Missing key in request body".to_string(),
            ))
        }
    };

    let data = body
        .and_then(|b| b.get("value"))
        .or_else(|| input.get("value"));

    let data = match data {
        Some(value) => value.clone(),
        None => {
            return error_response(iii_sdk::IIIError::Handler(
                "Missing value in request body".to_string(),
            ))
        }
    };

    let state_input = json!({
        "group_id": group_id,
        "item_id": item_id,
        "data": data
    });

    match bridge
        .call_with_timeout("state.set", state_input, Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_state_item_delete(bridge: &III, input: Value) -> Value {
    // Extract path parameters (from URL: /states/:group/item/:key)
    let path_params = input.get("path_params");

    tracing::debug!(path_params = ?path_params, "Received state item delete input");
    let group_id = path_params
        .and_then(|p| p.get("group"))
        .and_then(|v| v.as_str())
        .or_else(|| input.get("group").and_then(|v| v.as_str()));

    let group_id = match group_id {
        Some(id) => id.to_string(),
        None => {
            return error_response(iii_sdk::IIIError::Handler(
                "Missing group in path parameters".to_string(),
            ))
        }
    };

    let item_id = path_params
        .and_then(|p| p.get("key"))
        .and_then(|v| v.as_str())
        .or_else(|| input.get("key").and_then(|v| v.as_str()));

    let item_id = match item_id {
        Some(id) => id.to_string(),
        None => {
            return error_response(iii_sdk::IIIError::Handler(
                "Missing key in path parameters".to_string(),
            ))
        }
    };

    let state_input = json!({
        "group_id": group_id,
        "item_id": item_id
    });

    match bridge
        .call_with_timeout("state.delete", state_input, Duration::from_secs(5))
        .await
    {
        Ok(data) => success_response(data),
        Err(err) => error_response(err),
    }
}

async fn handle_streams_list(bridge: &III) -> Value {
    match bridge
        .call_with_timeout("streams.listAll", json!({}), Duration::from_secs(10))
        .await
    {
        Ok(data) => {
            // Transform to frontend format
            if let Some(streams) = data.get("streams").and_then(|s| s.as_array()) {
                let stream_objects: Vec<_> = streams
                    .iter()
                    .map(|stream| {
                        let id = stream.get("id").and_then(|v| v.as_str()).unwrap_or("");
                        let groups = stream
                            .get("groups")
                            .and_then(|v| v.as_array())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|g| g.as_str())
                                    .map(String::from)
                                    .collect::<Vec<_>>()
                            })
                            .unwrap_or_default();
                        let is_internal = id.starts_with("iii.") || id.starts_with("iii:");

                        json!({
                            "id": id,
                            "type": if is_internal { "system" } else { "user" },
                            "description": format!("{} stream", id),
                            "groups": groups,
                            "status": "active",
                            "internal": is_internal
                        })
                    })
                    .collect();

                success_response(json!({
                    "streams": stream_objects,
                    "count": stream_objects.len(),
                    "websocket_port": 3112
                }))
            } else {
                success_response(json!({ "streams": [], "count": 0, "websocket_port": 3112 }))
            }
        }
        Err(err) => error_response(err),
    }
}

pub fn register_functions(bridge: &III) {
    let b = bridge.clone();
    bridge.register_function("engine.console.health", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_health(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.workers", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_workers(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.functions", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_functions_list(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.triggers", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_triggers_list(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.status", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_status(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.trigger_types", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_trigger_types(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.alerts_list", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_alerts_list(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.sampling_rules", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_sampling_rules(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.otel_logs_list", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_otel_logs_list(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.otel_logs_clear", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_otel_logs_clear(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.otel_traces_list", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_otel_traces_list(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.otel_traces_clear", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_otel_traces_clear(&bridge).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.otel_traces_tree", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_otel_traces_tree(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.metrics_detailed", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_metrics_detailed(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.rollups_list", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_rollups_list(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.state_groups_list", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_state_groups_list(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.state_group_items", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_state_group_items(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.state_item_set", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_state_item_set(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.state_item_delete", move |input| {
        let bridge = b.clone();
        async move { Ok(handle_state_item_delete(&bridge, input).await) }
    });

    let b = bridge.clone();
    bridge.register_function("engine.console.streams_list", move |_input| {
        let bridge = b.clone();
        async move { Ok(handle_streams_list(&bridge).await) }
    });
}
