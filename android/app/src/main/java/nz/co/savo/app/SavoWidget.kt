package nz.co.savo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/*
 * Home-screen widget — 4x2 cells (landscape).
 *
 * Layout (single bitmap that scales to fit):
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │ QPY 356        │   [SAVO logo]   │        TAP TO CALL          │
 *   │ • Insurance    │      SAVO       │   ⊙        🚛        🚑     │
 *   │ • WOF  • Rego  │  PROTECT YOUR…  │ Roadside  Tow Truck Emerg.  │
 *   │   ◯◯◯ rings   │                 │                              │
 *   └────────────────────────────────────────────────────────────────┘
 */

internal const val WIDGET_PREFS = "savo_widget_prefs"
private const val ACTION_NEXT_VEHICLE = "nz.co.savo.app.widget.NEXT_VEHICLE"
private const val MAX_WIDGET_VEHICLES = 10

class SavoWidgetReceiver : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_NEXT_VEHICLE) return

        val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val next = nextVehicleIndex(prefs, current, count)
            if (next != current) {
                prefs.edit().putInt("vehicles_current_index", next).commit()
            }
        }
        redrawAll(context.applicationContext)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        refreshFromBackend(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?,
    ) {
        renderWidget(context, appWidgetManager, appWidgetId)
    }

    companion object {
        fun redrawAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, SavoWidgetReceiver::class.java))
            for (id in ids) renderWidget(context, mgr, id)
        }

        private fun renderWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            val count = prefs.getInt("vehicles_count", 0)
            val rawIndex = if (count > 0) prefs.getInt("vehicles_current_index", 0).coerceAtLeast(0) % count else 0
            val index = when {
                count <= 0 -> 0
                vehicleRegoAt(prefs, rawIndex).isNotBlank() -> rawIndex
                else -> nextVehicleIndex(prefs, rawIndex, count)
            }
            if (index != rawIndex) prefs.edit().putInt("vehicles_current_index", index).commit()

            val rego = if (count > 0) vehicleRegoAt(prefs, index) else ""
            val regoExpiry = if (count > 0) prefs.getString("vehicle_${index}_rego_expiry", "") ?: "" else ""
            val wofExpiry = if (count > 0) prefs.getString("vehicle_${index}_wof_expiry", "") ?: "" else ""
            val insExpiry = if (count > 0) prefs.getString("vehicle_${index}_insurance_expiry", "") ?: "" else ""
            val roadsidePhone = if (count > 0) prefs.getString("vehicle_${index}_roadside_phone", "") ?: "" else ""

            // Render at a fixed high-resolution canvas; the ImageView (fitCenter)
            // scales it crisply to whatever cell size the user picks.
            val views = RemoteViews(context.packageName, R.layout.widget_savo)
            val bmp = renderCardBitmap(rego, regoExpiry, wofExpiry, insExpiry)
            views.setImageViewBitmap(R.id.widget_canvas, bmp)

            views.setOnClickPendingIntent(R.id.widget_plate_area, switchPendingIntent(context))
            views.setOnClickPendingIntent(R.id.widget_savo_icon, deepLinkPendingIntent(context, 1002, "savo://quick-capture"))
            views.setOnClickPendingIntent(
                R.id.widget_call_roadside,
                if (roadsidePhone.isNotBlank()) telPendingIntent(context, 1003, roadsidePhone)
                else deepLinkPendingIntent(context, 1003, "savo://dashboard"),
            )
            views.setOnClickPendingIntent(R.id.widget_call_tow, deepLinkPendingIntent(context, 1004, "savo://tow-companies"))
            views.setOnClickPendingIntent(R.id.widget_call_emergency, telPendingIntent(context, 1005, "111"))

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun deepLinkPendingIntent(context: Context, requestCode: Int, uri: String): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
                setPackage(context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            return PendingIntent.getActivity(context, requestCode, intent, flags)
        }

        private fun telPendingIntent(context: Context, requestCode: Int, phone: String): PendingIntent {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone.replace(" ", ""))).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            return PendingIntent.getActivity(context, requestCode, intent, flags)
        }

        private fun switchPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, SavoWidgetReceiver::class.java).apply {
                action = ACTION_NEXT_VEHICLE
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            return PendingIntent.getBroadcast(context, 1001, intent, flags)
        }
    }
}

/** Compile-time placeholder for lingering references in the JS bridge. */
class SavoWidget {
    suspend fun updateAll(context: Context) {
        withContext(Dispatchers.Main) {
            SavoWidgetReceiver.redrawAll(context)
        }
    }
}

private fun daysUntil(dateStr: String?): Int? {
    if (dateStr.isNullOrBlank()) return null
    return try {
        val datePart = dateStr.substring(0, minOf(10, dateStr.length))
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
            isLenient = false
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val target = fmt.parse(datePart) ?: return null
        val nowCal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC")).apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }
        val diffMs = target.time - nowCal.timeInMillis
        (diffMs / (1000L * 60 * 60 * 24)).toInt()
    } catch (_: Exception) {
        null
    }
}

private fun vehicleRegoAt(prefs: SharedPreferences, index: Int): String =
    (prefs.getString("vehicle_${index}_rego", "") ?: "").trim()

private fun nextVehicleIndex(prefs: SharedPreferences, current: Int, count: Int): Int {
    if (count <= 1) return current.coerceAtLeast(0)
    for (step in 1..count) {
        val candidate = ((current + step) % count + count) % count
        if (vehicleRegoAt(prefs, candidate).isNotBlank()) return candidate
    }
    return current.coerceAtLeast(0) % count
}

// =============================================================================
// Card renderer — draws the entire widget UI as a single high-res bitmap.
// =============================================================================

// Canvas designed at 2:1 landscape aspect → matches the 4x2 cell widget shape.
private const val CARD_W = 1200
private const val CARD_H = 600

private val GREEN = 0xFF22C55E.toInt()
private val AMBER = 0xFFF5C56B.toInt()
private val BLUE = 0xFF6BB6F5.toInt()
private val ORANGE = 0xFFFF6A2C.toInt()
private val NAVY = 0xFF1E3A5F.toInt()
private val NAVY_DARK = 0xFF2A4A6F.toInt()
private val ACCENT_GREEN = 0xFF7CB342.toInt()
private val INK = 0xFF111113.toInt()
private val MUTED = 0xFF9CA3AF.toInt()
private val TRACK = 0xFFE5E7EB.toInt()
private val DIVIDER = 0xFFEDEDEF.toInt()
private val PILL_BG = 0xFFF1F1F4.toInt()
private val LOGO_BG = 0xFFFFFFFF.toInt()
private val LOGO_BORDER = 0xFFE8E8E5.toInt()
private val WINDSCREEN = 0xFFF4F4F2.toInt()
private val LENS_GREY = 0xFF6B7280.toInt()
private val LENS_DARK = 0xFF1A1A2E.toInt()

private fun renderCardBitmap(
    rego: String,
    regoExp: String,
    wofExp: String,
    insExp: String,
): Bitmap {
    val bmp = Bitmap.createBitmap(CARD_W, CARD_H, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    // Card background
    val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    val cardRect = RectF(0f, 0f, CARD_W.toFloat(), CARD_H.toFloat())
    canvas.drawRoundRect(cardRect, 36f, 36f, bgPaint)

    val pad = 36f

    // Two columns: left rego/rings (50%), right SAVO logo on top + icons below (50%)
    val colW = (CARD_W - pad * 2) * 0.50f
    val leftX = pad
    val rightX = leftX + colW

    // ── LEFT COLUMN ────────────────────────────────────────────────────────
    val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK
        textAlign = Paint.Align.LEFT
        isFakeBoldText = true
        textSize = 76f
        letterSpacing = -0.01f
        typeface = Typeface.create("sans-serif", Typeface.BOLD)
    }
    canvas.drawText(formatRego(rego), leftX, pad + 70f, titlePaint)

    // Legend (bigger text)
    val legendPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.LEFT
        textSize = 38f
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }
    val items = listOf(
        Triple("Insurance", GREEN, true),
        Triple("WOF", AMBER, false),
        Triple("Rego", BLUE, false),
    )
    var ly = pad + 130f
    for ((label, color, bold) in items) {
        val dot = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color; style = Paint.Style.FILL }
        canvas.drawCircle(leftX + 12f, ly - 12f, 12f, dot)
        legendPaint.color = if (bold) INK else MUTED
        legendPaint.isFakeBoldText = bold
        canvas.drawText(label, leftX + 36f, ly, legendPaint)
        ly += 50f
    }

    // Rings (right side of left column)
    val ringsCx = leftX + colW * 0.72f
    val ringsCy = CARD_H * 0.55f
    drawRings(
        canvas,
        cx = ringsCx,
        cy = ringsCy,
        outerR = 150f,
        stroke = 28f,
        insDays = daysUntil(insExp),
        wofDays = daysUntil(wofExp),
        regoDays = daysUntil(regoExp),
    )

    // Vertical divider between columns
    val dividerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = DIVIDER
        strokeWidth = 1.5f
    }
    canvas.drawLine(rightX - 8f, pad + 30f, rightX - 8f, CARD_H - pad - 30f, dividerPaint)

    // ── RIGHT COLUMN — SAVO logo on top, 3 big icons below ─────────────────
    val rightTopH = (CARD_H - pad * 2) * 0.40f
    val logoSize = minOf(rightTopH - 10f, colW * 0.55f)
    val logoLeft = rightX + (colW - logoSize) / 2f
    val logoTop = pad + (rightTopH - logoSize) / 2f
    drawSavoLogo(canvas, logoLeft, logoTop, logoSize)

    val iconsTop = pad + rightTopH
    val iconsH = (CARD_H - pad * 2) * 0.60f
    val cellW = colW / 3f
    val centersY = iconsTop + iconsH * 0.42f
    val btnR = minOf(cellW * 0.36f, iconsH * 0.34f)
    val labels = listOf("Roadside", "Tow Truck", "Emergency")
    val drawers: List<(Canvas, Float, Float, Float) -> Unit> = listOf(
        ::drawRoadsideIcon,
        ::drawTowTruckIcon,
        ::drawEmergencyIcon,
    )
    val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = PILL_BG; style = Paint.Style.FILL }
    val itemLabel = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK
        textAlign = Paint.Align.CENTER
        textSize = 30f
        isFakeBoldText = true
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }
    for (i in 0..2) {
        val cx = rightX + cellW * i + cellW / 2f
        canvas.drawCircle(cx, centersY, btnR, pillPaint)
        drawers[i](canvas, cx, centersY, btnR)
        canvas.drawText(labels[i], cx, centersY + btnR + 48f, itemLabel)
    }

    return bmp
}

/** Draws the actual SAVO brand logo (navy car with rooftop camera). */
private fun drawSavoLogo(canvas: Canvas, left: Float, top: Float, size: Float) {
    // Scale factor — original svg viewBox is 200x200
    val s = size / 200f
    fun x(v: Float) = left + v * s
    fun y(v: Float) = top + v * s
    fun r(v: Float) = v * s

    // White rounded background card
    val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = LOGO_BG }
    val border = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = LOGO_BORDER; style = Paint.Style.STROKE; strokeWidth = r(2f)
    }
    val rect = RectF(left, top, left + size, top + size)
    canvas.drawRoundRect(rect, r(44f), r(44f), bg)
    canvas.drawRoundRect(rect, r(44f), r(44f), border)

    val navy = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = NAVY }
    val navyDark = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = NAVY_DARK }
    val windscreen = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = WINDSCREEN }
    val grey = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = LENS_GREY }
    val dark = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = LENS_DARK }
    val white = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    val whiteSoft = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; alpha = 178 }
    val accentRing = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ACCENT_GREEN; style = Paint.Style.STROKE; strokeWidth = r(2.5f)
    }
    val whiteRing = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE; style = Paint.Style.STROKE; strokeWidth = r(3f)
    }

    // Car body (rect)
    canvas.drawRoundRect(RectF(x(18f), y(112f), x(182f), y(154f)), r(8f), r(8f), navy)
    // Cabin (trapezoid)
    val cabin = Path().apply {
        moveTo(x(44f), y(112f)); lineTo(x(60f), y(72f))
        lineTo(x(140f), y(72f)); lineTo(x(156f), y(112f)); close()
    }
    canvas.drawPath(cabin, navy)
    // Windscreen
    val wind = Path().apply {
        moveTo(x(52f), y(110f)); lineTo(x(66f), y(78f))
        lineTo(x(134f), y(78f)); lineTo(x(148f), y(110f)); close()
    }
    canvas.drawPath(wind, windscreen)
    // Body line
    canvas.drawRect(x(18f), y(128f), x(182f), y(130f), navyDark)

    // Left wheel
    canvas.drawCircle(x(56f), y(154f), r(22f), navy)
    canvas.drawCircle(x(56f), y(154f), r(14f), grey)
    canvas.drawCircle(x(56f), y(154f), r(8f), navy)
    canvas.drawCircle(x(56f), y(154f), r(3f), Paint(Paint.ANTI_ALIAS_FLAG).apply { color = LOGO_BORDER })
    canvas.drawCircle(x(56f), y(154f), r(23f), whiteRing)
    // Right wheel
    canvas.drawCircle(x(144f), y(154f), r(22f), navy)
    canvas.drawCircle(x(144f), y(154f), r(14f), grey)
    canvas.drawCircle(x(144f), y(154f), r(8f), navy)
    canvas.drawCircle(x(144f), y(154f), r(3f), Paint(Paint.ANTI_ALIAS_FLAG).apply { color = LOGO_BORDER })
    canvas.drawCircle(x(144f), y(154f), r(23f), whiteRing)

    // Camera lens on roof (concentric circles + green accent ring)
    canvas.drawCircle(x(100f), y(86f), r(23.5f), accentRing)
    canvas.drawCircle(x(100f), y(86f), r(22f), grey)
    canvas.drawCircle(x(100f), y(86f), r(16f), navy)
    canvas.drawCircle(x(100f), y(86f), r(11f), dark)
    canvas.drawCircle(x(100f), y(86f), r(6f), navy)
    canvas.drawCircle(x(93f), y(79f), r(3f), whiteSoft)
}

private fun formatRego(rego: String): String {
    val cleaned = rego.trim().uppercase()
    return if (cleaned.isBlank()) "— — —" else cleaned
}

private fun drawRings(
    canvas: Canvas,
    cx: Float,
    cy: Float,
    outerR: Float,
    stroke: Float,
    insDays: Int?,
    wofDays: Int?,
    regoDays: Int?,
) {
    val gap = stroke * 0.55f
    val radii = floatArrayOf(outerR, outerR - stroke - gap, outerR - 2f * (stroke + gap))
    val colors = intArrayOf(GREEN, AMBER, BLUE)
    val days = arrayOf(insDays, wofDays, regoDays)

    val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = TRACK
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
    }
    val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
    }
    for (i in 0..2) {
        val r = radii[i]
        val rect = RectF(cx - r, cy - r, cx + r, cy + r)
        canvas.drawArc(rect, 0f, 360f, false, track)
        val d = days[i]
        if (d != null) {
            // Map days remaining (clamped 0..365) to a sweep angle (0..360)
            val frac = (d.coerceIn(0, 365)) / 365f
            arc.color = colors[i]
            canvas.drawArc(rect, -90f, 360f * frac, false, arc)
        }
    }
}

// ─── Tiny vector icons drawn directly onto the canvas ────────────────────────
// `r` is the surrounding pill radius — icons scale to fit.
private fun drawRoadsideIcon(canvas: Canvas, cx: Float, cy: Float, r: Float) {
    val s = r / 32f
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK; style = Paint.Style.STROKE; strokeWidth = 4.5f * s; strokeCap = Paint.Cap.ROUND
    }
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.FILL }
    val body = RectF(cx - 28f * s, cy - 4f * s, cx + 28f * s, cy + 14f * s)
    canvas.drawRoundRect(body, 6f * s, 6f * s, stroke)
    val roof = Path().apply {
        moveTo(cx - 18f * s, cy - 4f * s); lineTo(cx - 12f * s, cy - 16f * s)
        lineTo(cx + 12f * s, cy - 16f * s); lineTo(cx + 18f * s, cy - 4f * s); close()
    }
    canvas.drawPath(roof, stroke)
    canvas.drawCircle(cx - 16f * s, cy + 16f * s, 4f * s, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK })
    canvas.drawCircle(cx + 16f * s, cy + 16f * s, 4f * s, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK })
    val light = Path().apply {
        moveTo(cx - 5f * s, cy - 16f * s); lineTo(cx, cy - 24f * s); lineTo(cx + 5f * s, cy - 16f * s); close()
    }
    canvas.drawPath(light, orange)
}

private fun drawTowTruckIcon(canvas: Canvas, cx: Float, cy: Float, r: Float) {
    val s = r / 32f
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK; style = Paint.Style.STROKE; strokeWidth = 4.5f * s; strokeCap = Paint.Cap.ROUND
    }
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.FILL }
    val cab = RectF(cx - 26f * s, cy - 2f * s, cx - 6f * s, cy + 14f * s)
    canvas.drawRoundRect(cab, 4f * s, 4f * s, stroke)
    val bed = RectF(cx - 6f * s, cy + 4f * s, cx + 26f * s, cy + 14f * s)
    canvas.drawRoundRect(bed, 3f * s, 3f * s, stroke)
    canvas.drawLine(cx + 20f * s, cy + 4f * s, cx - 8f * s, cy - 18f * s, stroke)
    val flag = Path().apply {
        moveTo(cx - 8f * s, cy - 18f * s); lineTo(cx - 22f * s, cy - 14f * s); lineTo(cx - 8f * s, cy - 10f * s); close()
    }
    canvas.drawPath(flag, orange)
    val wheels = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK }
    canvas.drawCircle(cx - 18f * s, cy + 16f * s, 4f * s, wheels)
    canvas.drawCircle(cx + 6f * s, cy + 16f * s, 4f * s, wheels)
    canvas.drawCircle(cx + 18f * s, cy + 16f * s, 4f * s, wheels)
}

private fun drawEmergencyIcon(canvas: Canvas, cx: Float, cy: Float, r: Float) {
    val s = r / 32f
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK; style = Paint.Style.STROKE; strokeWidth = 4.5f * s; strokeCap = Paint.Cap.ROUND
    }
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.FILL }
    val body = RectF(cx - 26f * s, cy - 10f * s, cx + 22f * s, cy + 14f * s)
    canvas.drawRoundRect(body, 5f * s, 5f * s, stroke)
    canvas.drawLine(cx + 6f * s, cy - 10f * s, cx + 6f * s, cy + 4f * s, stroke)
    val wheels = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK }
    canvas.drawCircle(cx - 16f * s, cy + 16f * s, 4f * s, wheels)
    canvas.drawCircle(cx + 14f * s, cy + 16f * s, 4f * s, wheels)
    val crossPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.STROKE; strokeWidth = 3.5f * s; strokeCap = Paint.Cap.ROUND }
    canvas.drawLine(cx - 8f * s, cy - 4f * s, cx - 8f * s, cy + 8f * s, crossPaint)
    canvas.drawLine(cx - 14f * s, cy + 2f * s, cx - 2f * s, cy + 2f * s, crossPaint)
    canvas.drawCircle(cx + 18f * s, cy - 12f * s, 3f * s, orange)
}

// =============================================================================
// Backend refresh (unchanged)
// =============================================================================

internal fun refreshFromBackend(context: Context) {
    val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
    val token = prefs.getString("widget_token", null)
    val baseUrl = prefs.getString("supabase_url", null)
    if (token.isNullOrBlank() || baseUrl.isNullOrBlank()) return
    val anon = prefs.getString("supabase_anon", null) ?: ""

    GlobalScope.launch(Dispatchers.IO) {
        try {
            val cleanBaseUrl = baseUrl.trimEnd('/')
            val url = URL("$cleanBaseUrl/functions/v1/widget-data")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("X-Widget-Token", token)
            if (anon.isNotEmpty()) conn.setRequestProperty("apikey", anon)
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            if (conn.responseCode != 200) return@launch
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)

            val vehiclesArr: JSONArray? = json.optJSONArray("vehicles")
            val totalAvailable = vehiclesArr?.length() ?: 0
            val prevCount = prefs.getInt("vehicles_count", 0)
            if (totalAvailable == 0 && prevCount > 0) return@launch

            val editor = prefs.edit()
            for (i in 0 until maxOf(prevCount, MAX_WIDGET_VEHICLES)) {
                editor.remove("vehicle_${i}_rego")
                editor.remove("vehicle_${i}_rego_expiry")
                editor.remove("vehicle_${i}_wof_expiry")
                editor.remove("vehicle_${i}_insurance_expiry")
            }
            var total = 0
            if (vehiclesArr != null) {
                for (i in 0 until totalAvailable) {
                    if (total >= MAX_WIDGET_VEHICLES) break
                    val v = vehiclesArr.optJSONObject(i) ?: continue
                    val rego = v.optString("rego", "").trim()
                    if (rego.isBlank()) continue
                    editor.putString("vehicle_${total}_rego", rego)
                    editor.putString("vehicle_${total}_rego_expiry", v.optString("regoExpiry", ""))
                    editor.putString("vehicle_${total}_wof_expiry", v.optString("wofExpiry", ""))
                    editor.putString("vehicle_${total}_insurance_expiry", v.optString("insuranceExpiry", ""))
                    val rs = v.optString("roadsidePhone", "")
                    if (rs.isNotBlank()) editor.putString("vehicle_${total}_roadside_phone", rs)
                    total++
                }
            }
            if (total == 0 && prevCount > 0) return@launch
            editor.putInt("vehicles_count", total)
            val curIdx = prefs.getInt("vehicles_current_index", 0)
            if (total == 0 || curIdx >= total) editor.putInt("vehicles_current_index", 0)
            editor.commit()

            withContext(Dispatchers.Main) {
                SavoWidgetReceiver.redrawAll(context)
            }
        } catch (_: Exception) {
            // keep showing cached data
        }
    }
}
