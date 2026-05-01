# Add project specific ProGuard rules here.

# Keep widget classes callable from the launcher in minified release builds.
-keep class nz.co.savo.app.SavoWidget { *; }
-keep class nz.co.savo.app.SavoWidgetReceiver { *; }
-keep class nz.co.savo.app.WidgetVehicleSwitchActivity { *; }
-keep class nz.co.savo.app.WidgetBridge { *; }
