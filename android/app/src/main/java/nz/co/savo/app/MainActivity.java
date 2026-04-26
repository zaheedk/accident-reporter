package nz.co.savo.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        // Expose widget bridge to the WebView so the React app can write
        // the widget token into SharedPreferences.
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(
                new WidgetBridge(getApplicationContext()),
                "SavoWidgetBridge"
            );
        }
    }
}
