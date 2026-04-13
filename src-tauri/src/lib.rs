use tauri::{
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[tauri::command]
fn update_tray_state(app: tauri::AppHandle, triggered: bool, count: u32) {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if triggered {
            format!("Bad Habit Fixer \u{2014} Caught one! ({} total)", count)
        } else {
            format!("Bad Habit Fixer \u{2014} Watching ({} catches)", count)
        };
        let _ = tray.set_tooltip(Some(&tooltip));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System tray icon — shows the app is running in the background.
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Bad Habit Fixer \u{2014} Watching")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Minimize to tray instead of quitting — keeps the camera running.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![update_tray_state])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
