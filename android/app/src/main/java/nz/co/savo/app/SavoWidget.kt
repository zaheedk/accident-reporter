package nz.co.savo.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.Image
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

class SavoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)

            val vehicleCount = prefs.getInt("vehicles_count", 0)
            val currentIndex = if (vehicleCount > 0) {
                prefs.getInt("vehicles_current_index", 0).coerceAtLeast(0) % vehicleCount
            } else 0

            val rego = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_rego", "") ?: ""
            else ""
            val regoExpiry = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_rego_expiry", "") ?: ""
            else ""
            val wofExpiry = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_wof_expiry", "") ?: ""
            else ""
            val insuranceExpiry = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_insurance_expiry", "") ?: ""
            else ""
            val roadsidePhone = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_roadside_phone", "") ?: ""
            else ""
            val roadsideName = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_roadside_name", "") ?: "Roadside"
            else "Roadside"

            WidgetBody(
                rego = rego,
                regoExpiry = regoExpiry,
                wofExpiry = wofExpiry,
                insuranceExpiry = insuranceExpiry,
                roadsideName = roadsideName,
                roadsidePhone = roadsidePhone,
                showSwitch = vehicleCount > 1,
            )
        }
    }
}

@Composable
private fun WidgetBody(
    rego: String,
    regoExpiry: String,
    wofExpiry: String,
    insuranceExpiry: String,
    roadsideName: String,
    roadsidePhone: String,
    showSwitch: Boolean,
) {
    // Light palette — white background, blue brand, dark text.
    val bg = ColorProvider(Color(0xFFFFFFFF))
    val brand = ColorProvider(Color(0xFF1E3A5F))      // SAVO navy-blue
    val accent = ColorProvider(Color(0xFF2563EB))     // Capture (blue)
    val text = ColorProvider(Color(0xFF0F172A))
    val muted = ColorProvider(Color(0xFF64748B))
    val plateBg = ColorProvider(Color(0xFFFBBF24))
    val plateFg = ColorProvider(Color(0xFF111827))
    val pillBg = ColorProvider(Color(0xFFF1F5F9))     // Light grey pill (Google-style)
    val pillFg = ColorProvider(Color(0xFF1E3A5F))
    val white = ColorProvider(Color(0xFFFFFFFF))

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(bg)
            .cornerRadius(28.dp)
            .padding(14.dp)
    ) {
        // Header row: SAVO + plate + switcher
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Image(
                provider = ImageProvider(R.mipmap.ic_launcher),
                contentDescription = "SAVO",
                modifier = GlanceModifier.size(22.dp),
            )
            Spacer(GlanceModifier.width(8.dp))
            Text(
                text = "SAVO",
                style = TextStyle(color = brand, fontSize = 18.sp, fontWeight = FontWeight.Bold),
            )
            Spacer(GlanceModifier.defaultWeight())
            if (showSwitch) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .size(36.dp)
                        .background(pillBg)
                        .cornerRadius(18.dp)
                        .clickable(actionRunCallback<PrevVehicleAction>())
                ) { Text("◀", style = TextStyle(color = pillFg, fontSize = 14.sp, fontWeight = FontWeight.Bold)) }
                Spacer(GlanceModifier.width(6.dp))
            }
            if (rego.isNotEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .background(plateBg)
                        .cornerRadius(8.dp)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) { Text(rego, style = TextStyle(color = plateFg, fontSize = 16.sp, fontWeight = FontWeight.Bold)) }
            }
            if (showSwitch) {
                Spacer(GlanceModifier.width(6.dp))
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .size(36.dp)
                        .background(pillBg)
                        .cornerRadius(18.dp)
                        .clickable(actionRunCallback<NextVehicleAction>())
                ) { Text("▶", style = TextStyle(color = pillFg, fontSize = 14.sp, fontWeight = FontWeight.Bold)) }
            }
        }
        Spacer(GlanceModifier.height(12.dp))

        // Expiry pill — Google-style rounded bar with all 3 expiries
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .background(pillBg)
                .cornerRadius(28.dp)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ExpiryCell("Rego", regoExpiry, pillFg, muted, GlanceModifier.defaultWeight())
            ExpiryCell("WOF", wofExpiry, pillFg, muted, GlanceModifier.defaultWeight())
            ExpiryCell("Insurance", insuranceExpiry, pillFg, muted, GlanceModifier.defaultWeight())
        }

        Spacer(GlanceModifier.height(10.dp))

        // Quick Accident Capture — full width, big blue pill
        Box(
            contentAlignment = Alignment.Center,
            modifier = GlanceModifier
                .fillMaxWidth()
                .height(52.dp)
                .background(accent)
                .cornerRadius(26.dp)
                .clickable(actionStartActivity(deepLinkIntent("savo://quick-capture")))
        ) {
            Text(
                "Quick Accident Capture",
                style = TextStyle(color = white, fontSize = 16.sp, fontWeight = FontWeight.Bold),
            )
        }
        Spacer(GlanceModifier.height(8.dp))

        // Roadside + 111 — big circular-pill action buttons
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            ActionButton(
                label = if (roadsidePhone.isNotEmpty()) roadsideName.take(14) else "Roadside",
                colorBg = ColorProvider(Color(0xFF0EA5E9)),
                colorFg = white,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent(roadsidePhone))
                ),
            )
            Spacer(GlanceModifier.width(8.dp))
            ActionButton(
                label = "Call 111",
                colorBg = ColorProvider(Color(0xFFB91C1C)),
                colorFg = white,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent("111"))
                ),
            )
        }
    }
}

@Composable
private fun ExpiryCell(
    label: String,
    isoDate: String,
    text: ColorProvider,
    muted: ColorProvider,
    modifier: GlanceModifier,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(label, style = TextStyle(color = muted, fontSize = 11.sp, fontWeight = FontWeight.Medium))
        Spacer(GlanceModifier.height(2.dp))
        Text(
            formatDaysLeft(isoDate),
            style = TextStyle(color = text, fontSize = 14.sp, fontWeight = FontWeight.Bold),
        )
    }
}

private fun formatDaysLeft(isoDate: String): String {
    if (isoDate.isBlank()) return "—"
    return try {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        val target = fmt.parse(isoDate) ?: return "—"
        val today = fmt.parse(fmt.format(java.util.Date())) ?: return "—"
        val diff = TimeUnit.MILLISECONDS.toDays(target.time - today.time)
        when {
            diff > 1 -> "$diff days"
            diff == 1L -> "1 day"
            diff == 0L -> "Today"
            diff == -1L -> "-1 day"
            else -> "${diff}d"
        }
    } catch (_: Exception) { "—" }
}

@Composable
private fun ActionButton(
    label: String,
    colorBg: ColorProvider,
    colorFg: ColorProvider,
    modifier: GlanceModifier,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .height(52.dp)
            .background(colorBg)
            .cornerRadius(26.dp)
    ) {
        Text(label, style = TextStyle(color = colorFg, fontSize = 15.sp, fontWeight = FontWeight.Bold))
    }
}

private fun deepLinkIntent(uri: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(uri)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

private fun callIntent(phone: String): Intent {
    if (phone.isBlank()) return Intent(Intent.ACTION_VIEW, Uri.parse("savo://dashboard"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}

class NextVehicleAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        cycleVehicle(context, glanceId, +1)
    }
}

class PrevVehicleAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        cycleVehicle(context, glanceId, -1)
    }
}

private suspend fun cycleVehicle(context: Context, glanceId: GlanceId, delta: Int) {
    val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
    val count = prefs.getInt("vehicles_count", 0)
    if (count > 1) {
        val current = prefs.getInt("vehicles_current_index", 0)
        val next = ((current + delta) % count + count) % count
        // apply() is async — does not block the main thread on disk I/O.
        prefs.edit().putInt("vehicles_current_index", next).apply()
    }
    // Update only this widget instance, not all — much faster and avoids
    // re-triggering the network refresh in onUpdate.
    SavoWidget().update(context, glanceId)
}

class SavoWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SavoWidget()

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        refreshFromBackend(context)
    }

    private fun refreshFromBackend(context: Context) {
        val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("widget_token", null) ?: return
        val baseUrl = prefs.getString("supabase_url", null) ?: return
        val anon = prefs.getString("supabase_anon", null) ?: ""

        GlobalScope.launch(Dispatchers.IO) {
            try {
                val url = URL("$baseUrl/functions/v1/widget-data")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.setRequestProperty("X-Widget-Token", token)
                if (anon.isNotEmpty()) conn.setRequestProperty("apikey", anon)
                conn.connectTimeout = 8000
                conn.readTimeout = 8000

                if (conn.responseCode != 200) return@launch
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(body)

                val editor = prefs.edit()

                // Clear previous vehicle list
                val prevCount = prefs.getInt("vehicles_count", 0)
                for (i in 0 until prevCount.coerceAtLeast(10)) {
                    editor.remove("vehicle_${i}_rego")
                    editor.remove("vehicle_${i}_rego_expiry")
                    editor.remove("vehicle_${i}_wof_expiry")
                    editor.remove("vehicle_${i}_insurance_expiry")
                    editor.remove("vehicle_${i}_roadside_name")
                    editor.remove("vehicle_${i}_roadside_phone")
                }

                val vehiclesArr: JSONArray? = json.optJSONArray("vehicles")
                val total = minOf(10, vehiclesArr?.length() ?: 0)
                editor.putInt("vehicles_count", total)
                if (vehiclesArr != null) {
                    for (i in 0 until total) {
                        val v = vehiclesArr.optJSONObject(i) ?: continue
                        editor.putString("vehicle_${i}_rego", v.optString("rego", ""))
                        editor.putString("vehicle_${i}_rego_expiry", v.optString("regoExpiry", ""))
                        editor.putString("vehicle_${i}_wof_expiry", v.optString("wofExpiry", ""))
                        editor.putString("vehicle_${i}_insurance_expiry", v.optString("insuranceExpiry", ""))
                        editor.putString("vehicle_${i}_roadside_name", v.optString("roadsideName", "Roadside"))
                        editor.putString("vehicle_${i}_roadside_phone", v.optString("roadsidePhone", ""))
                    }
                }
                val curIdx = prefs.getInt("vehicles_current_index", 0)
                if (total == 0 || curIdx >= total) editor.putInt("vehicles_current_index", 0)

                editor.apply()

                withContext(Dispatchers.Main) {
                    SavoWidget().updateAll(context)
                }
            } catch (_: Exception) {
                // keep showing cached data
            }
        }
    }
}
