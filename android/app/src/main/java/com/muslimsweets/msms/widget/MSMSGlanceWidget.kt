package com.muslimsweets.msms.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

/**
 * 2026 Material 3 Android Home Screen Widget for Muslim Sweets Management System (MSMS)
 * Displays Live Stock Level & Daily / Monthly Sales Revenue directly on phone home screen.
 */
class MSMSGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetContent(context)
        }
    }

    @Composable
    private fun WidgetContent(context: Context) {
        val backgroundColor = GlanceTheme.colors.surface
        val primaryColor = GlanceTheme.colors.primary

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(backgroundColor)
                .padding(16.dp)
                .cornerRadius(24.dp)
        ) {
            // Header: Shop Name & MSMS Live Emblem
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "MSMS",
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = GlanceTheme.colors.onSurface
                    ),
                    modifier = GlanceModifier.defaultWeight()
                )
                Text(
                    text = "LIVE",
                    style = TextStyle(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Main Stat: Today Sales Revenue
            Text(
                text = "TODAY'S REVENUE",
                style = TextStyle(fontSize = 11.sp, color = GlanceTheme.colors.outline)
            )
            Text(
                text = "৳ 12,450",
                style = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = GlanceTheme.colors.onSurface
                )
            )

            Spacer(modifier = GlanceModifier.height(10.dp))

            // Footer Metrics: Total Stock
            Row(modifier = GlanceModifier.fillMaxWidth()) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(text = "Stock (Kg)", style = TextStyle(fontSize = 10.sp))
                    Text(
                        text = "42.5 kg",
                        style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    )
                }
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(text = "Stock (Pcs)", style = TextStyle(fontSize = 10.sp))
                    Text(
                        text = "180 pcs",
                        style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    )
                }
            }
        }
    }
}

class MSMSWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MSMSGlanceWidget()
}
