package it.promemo.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Widget home screen: mostra il conto alla rovescia della prossima scadenza.
 * Legge i dati scritti dall'app web via @capacitor/preferences
 * (SharedPreferences "CapacitorStorage").
 */
public class ScadenzeWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_scadenze);

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String title = prefs.getString("widget_title", null);
        String due = prefs.getString("widget_due", null);

        if (title == null || due == null) {
            views.setTextViewText(R.id.widget_label, "SCADENZE");
            views.setTextViewText(R.id.widget_title, "Nessuna scadenza");
            views.setTextViewText(R.id.widget_days, "🎉");
            views.setTextViewText(R.id.widget_unit, "");
            views.setTextViewText(R.id.widget_sub, "Tutto in regola");
        } else {
            long days = daysUntil(due);
            views.setTextViewText(R.id.widget_label, "PROSSIMA SCADENZA");
            views.setTextViewText(R.id.widget_title, title);

            if (days < 0) {
                views.setTextViewText(R.id.widget_days, String.valueOf(-days));
                views.setTextViewText(R.id.widget_unit, (-days == 1 ? "giorno fa" : "giorni fa"));
                views.setTextViewText(R.id.widget_sub, "Scaduta");
            } else if (days == 0) {
                views.setTextViewText(R.id.widget_days, "Oggi");
                views.setTextViewText(R.id.widget_unit, "");
                views.setTextViewText(R.id.widget_sub, "Scade oggi!");
            } else {
                views.setTextViewText(R.id.widget_days, String.valueOf(days));
                views.setTextViewText(R.id.widget_unit, (days == 1 ? "giorno" : "giorni"));
                views.setTextViewText(R.id.widget_sub, "alla scadenza");
            }
        }

        // Tap sul widget → apre l'app
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(context, 0, launch, flags);
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    /** Giorni da oggi (mezzanotte) alla data yyyy-MM-dd. Negativo se passata. */
    static long daysUntil(String ymd) {
        try {
            SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date dueDate = fmt.parse(ymd);
            if (dueDate == null) return 0;

            Calendar today = Calendar.getInstance();
            zeroTime(today);

            Calendar due = Calendar.getInstance();
            due.setTime(dueDate);
            zeroTime(due);

            long diff = due.getTimeInMillis() - today.getTimeInMillis();
            return Math.round(diff / 86400000.0);
        } catch (Exception e) {
            return 0;
        }
    }

    private static void zeroTime(Calendar c) {
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
    }
}
