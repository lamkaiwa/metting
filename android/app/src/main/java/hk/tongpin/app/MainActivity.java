package hk.tongpin.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import java.util.Collections;

/** Installed entry to the live service; authentication remains in the user's browser. */
public final class MainActivity extends Activity {
    static final String SITE_URL = "https://tongpin-hk.jovial-knoll-4654.chatgpt.site/";
    private TextView error;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        renderHome();
        if (savedInstanceState == null) {
            // Open directly on a fresh launch; closing the tab returns to a usable retry screen.
            getWindow().getDecorView().post(this::openSite);
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void renderHome() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.rgb(247, 246, 242));
        root.setPadding(dp(30), dp(30), dp(30), dp(30));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top = insets.getSystemWindowInsetTop();
            int bottom = insets.getSystemWindowInsetBottom();
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                top = bars.top; bottom = bars.bottom;
            }
            view.setPadding(dp(30), dp(30) + top, dp(30), dp(30) + bottom);
            return insets;
        });
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.logo);
        logo.setContentDescription(getString(R.string.app_name));
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(76), dp(76));
        logoParams.bottomMargin = dp(28);
        root.addView(logo, logoParams);
        root.addView(text(R.string.app_name, 20, "#31584B", true), spaced(dp(8)));
        root.addView(text(R.string.headline, 32, "#31584B", true), spaced(dp(14)));
        root.addView(text(R.string.subtitle, 14, "#7E8B72", false), spaced(dp(28)));
        root.addView(text(R.string.hint, 14, "#7E8B72", false), spaced(dp(30)));
        Button enter = new Button(this);
        enter.setText(R.string.open_site);
        enter.setTextSize(16);
        enter.setTextColor(Color.WHITE);
        enter.setAllCaps(false);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(223, 104, 76));
        background.setCornerRadius(dp(14));
        enter.setBackground(background);
        enter.setOnClickListener(v -> openSite());
        root.addView(enter, new LinearLayout.LayoutParams(-1, dp(54)));
        error = text(0, 13, "#A14E36", false);
        error.setVisibility(View.GONE);
        root.addView(error, spaced(dp(12)));
        root.addView(text(R.string.account_note, 12, "#97A087", false), spaced(dp(20)));
        TextView fallback = text(R.string.open_browser, 13, "#58734C", false);
        fallback.setPadding(dp(8), dp(16), dp(8), dp(16));
        fallback.setOnClickListener(v -> openInBrowser());
        root.addView(fallback, spaced(dp(20)));
        root.addView(text(R.string.respect, 11, "#97A087", false));
        setContentView(root);
    }

    private LinearLayout.LayoutParams spaced(int margin) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.bottomMargin = margin;
        return params;
    }

    private TextView text(int stringId, int size, String color, boolean bold) {
        TextView view = new TextView(this);
        if (stringId != 0) view.setText(stringId);
        view.setTextSize(size);
        view.setTextColor(Color.parseColor(color));
        view.setGravity(Gravity.CENTER);
        view.setLineSpacing(dp(4), 1f);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private void openSite() {
        error.setVisibility(View.GONE);
        try {
            CustomTabsIntent tab = new CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(Color.rgb(247, 246, 242))
                    .setNavigationBarColor(Color.rgb(247, 246, 242)).build())
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_LIGHT)
                .setShowTitle(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build();
            String browser = CustomTabsClient.getPackageName(this, Collections.emptyList());
            if (browser != null) tab.intent.setPackage(browser);
            tab.launchUrl(this, Uri.parse(SITE_URL));
        } catch (ActivityNotFoundException e) {
            showError(R.string.browser_unavailable);
        } catch (SecurityException e) {
            showError(R.string.browser_failed);
        }
    }

    private void openInBrowser() {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(SITE_URL))
                .addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException e) {
            showError(R.string.browser_unavailable);
        } catch (SecurityException e) {
            showError(R.string.browser_failed);
        }
    }

    private void showError(int message) { error.setText(message); error.setVisibility(View.VISIBLE); }
}
