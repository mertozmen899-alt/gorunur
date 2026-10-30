package com.gorunur.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.net.URISyntaxException;

/**
 * Görünür uygulaması: sitenin canlı halini açar.
 * Sitede yapılan her güncelleme, uygulamayı yeniden kurmadan burada da görünür.
 */
public class MainActivity extends Activity {

    /** Uygulamanın içinde açılacak adresler. Bunların dışındaki bağlantılar (WhatsApp, telefon, haritalar...) kendi uygulamasında açılır. */
    private static final String[] IZINLI_ALANLAR = {
            "mertozmen899-alt.github.io",
            "gorunur.com.tr", "www.gorunur.com.tr",
            "gorunur.com", "www.gorunur.com"
    };
    private static final String CEVRIMDISI = "file:///android_asset/cevrimdisi.html";
    private static final int DOSYA_SEC = 41;
    private static final int AMBER = 0xFFF5B301;

    private WebView web;
    private SwipeRefreshLayout yenile;
    private ProgressBar cubuk;
    private String sonAdres;
    private boolean gecmisiTemizle;
    private ValueCallback<Uri[]> dosyaGeriDonus;

    @Override
    protected void onCreate(Bundle kayit) {
        super.onCreate(kayit);
        ekraniHazirla();

        FrameLayout kok = new FrameLayout(this);
        kok.setBackgroundColor(Color.WHITE);

        yenile = new SwipeRefreshLayout(this);
        yenile.setColorSchemeColors(AMBER);

        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        yenile.addView(web, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        kok.addView(yenile, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        cubuk = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        cubuk.setMax(100);
        cubuk.setIndeterminate(false);
        cubuk.setProgressTintList(ColorStateList.valueOf(AMBER));
        cubuk.setProgressBackgroundTintList(ColorStateList.valueOf(Color.TRANSPARENT));
        kok.addView(cubuk, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(3), Gravity.TOP));

        setContentView(kok);
        bosluklariAyarla(kok);

        webAyarla();

        yenile.setOnChildScrollUpCallback((ust, cocuk) -> web.getScrollY() > 0);
        yenile.setOnRefreshListener(() -> {
            if (CEVRIMDISI.equals(web.getUrl())) {
                tekrarDene();
            } else {
                web.reload();
            }
        });

        if (kayit != null) {
            web.restoreState(kayit);
        }
        if (kayit == null || web.getUrl() == null) {
            String acilis = disaridanGelenAdres(getIntent());
            web.loadUrl(acilis != null ? acilis : BuildConfig.BASLANGIC);
        }
    }

    private void ekraniHazirla() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int acik = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(acik, acik);
            }
        } else {
            w.setStatusBarColor(Color.WHITE);
            w.setNavigationBarColor(Color.WHITE);
            int bayrak = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            w.getDecorView().setSystemUiVisibility(bayrak);
        }
    }

    /** Android 11 ve üstünde içerik saat/pil çubuğunun ve klavyenin altında kalmasın. */
    private void bosluklariAyarla(View kok) {
        if (Build.VERSION.SDK_INT < 30) return;
        kok.setOnApplyWindowInsetsListener((v, ic) -> {
            android.graphics.Insets b = ic.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.ime()
                    | WindowInsets.Type.displayCutout());
            v.setPadding(b.left, b.top, b.right, b.bottom);
            return WindowInsets.CONSUMED;
        });
    }

    private void webAyarla() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " GorunurApp/" + BuildConfig.VERSION_NAME);

        CookieManager cerez = CookieManager.getInstance();
        cerez.setAcceptCookie(true);
        cerez.setAcceptThirdPartyCookies(web, true);

        // Sadece çevrimdışı sayfadaki "Tekrar dene" düğmesi için.
        web.addJavascriptInterface(new Kopru(), "GorunurUygulama");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest istek) {
                return adresiYonet(istek.getUrl());
            }

            @Override
            public void onPageStarted(WebView v, String adres, android.graphics.Bitmap ikon) {
                if (adres != null && adres.startsWith("http")) sonAdres = adres;
                cubuk.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView v, String adres) {
                yenile.setRefreshing(false);
                cubuk.setVisibility(View.GONE);
                if (gecmisiTemizle && adres != null && !adres.equals(CEVRIMDISI)) {
                    gecmisiTemizle = false;
                    v.clearHistory();
                }
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest istek, WebResourceError hata) {
                if (istek.isForMainFrame()) {
                    yenile.setRefreshing(false);
                    v.loadUrl(CEVRIMDISI);
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView v, int yuzde) {
                cubuk.setProgress(yuzde);
                cubuk.setVisibility(yuzde >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> geriDonus,
                                             FileChooserParams ayar) {
                if (dosyaGeriDonus != null) dosyaGeriDonus.onReceiveValue(null);
                dosyaGeriDonus = geriDonus;
                try {
                    startActivityForResult(ayar.createIntent(), DOSYA_SEC);
                    return true;
                } catch (ActivityNotFoundException e) {
                    dosyaGeriDonus = null;
                    return false;
                }
            }
        });

        // İndirilecek bir dosya olursa telefonun tarayıcısı indirsin.
        web.setDownloadListener((adres, ua, aciklama, tur, boyut) -> disaridaAc(Uri.parse(adres)));
    }

    /** true: uygulama dışında açıldı. false: uygulamanın içinde açılsın. */
    private boolean adresiYonet(Uri u) {
        String sema = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        if (("https".equals(sema) || "http".equals(sema)) && izinli(u.getHost())) {
            return false;
        }
        if ("intent".equals(sema)) {
            try {
                Intent i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                i.addCategory(Intent.CATEGORY_BROWSABLE);
                i.setComponent(null);
                i.setSelector(null);
                startActivity(i);
            } catch (URISyntaxException | ActivityNotFoundException e) {
                String yedek = u.toString().contains("S.browser_fallback_url=") ? yedekAdres(u.toString()) : null;
                if (yedek != null) disaridaAc(Uri.parse(yedek));
            }
            return true;
        }
        disaridaAc(u);
        return true;
    }

    private static String yedekAdres(String niyet) {
        try {
            Intent i = Intent.parseUri(niyet, Intent.URI_INTENT_SCHEME);
            return i.getStringExtra("browser_fallback_url");
        } catch (URISyntaxException e) {
            return null;
        }
    }

    private static boolean izinli(String alan) {
        if (alan == null) return false;
        for (String a : IZINLI_ALANLAR) {
            if (a.equalsIgnoreCase(alan)) return true;
        }
        return false;
    }

    private void disaridaAc(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Bu bağlantıyı açacak bir uygulama bulunamadı.", Toast.LENGTH_SHORT).show();
        }
    }

    private String disaridanGelenAdres(Intent i) {
        if (i == null || !Intent.ACTION_VIEW.equals(i.getAction()) || i.getData() == null) return null;
        Uri u = i.getData();
        return "https".equals(u.getScheme()) && izinli(u.getHost()) ? u.toString() : null;
    }

    private void tekrarDene() {
        gecmisiTemizle = true;
        web.loadUrl(sonAdres != null ? sonAdres : BuildConfig.BASLANGIC);
    }

    private class Kopru {
        @JavascriptInterface
        public void tekrarDene() {
            runOnUiThread(MainActivity.this::tekrarDene);
        }
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        String adres = disaridanGelenAdres(i);
        if (adres != null) web.loadUrl(adres);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack() && !CEVRIMDISI.equals(web.getUrl())) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int istek, int sonuc, Intent veri) {
        if (istek == DOSYA_SEC && dosyaGeriDonus != null) {
            dosyaGeriDonus.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(sonuc, veri));
            dosyaGeriDonus = null;
            return;
        }
        super.onActivityResult(istek, sonuc, veri);
    }

    @Override
    protected void onSaveInstanceState(Bundle kayit) {
        super.onSaveInstanceState(kayit);
        web.saveState(kayit);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }

    private int dp(int deger) {
        return Math.round(deger * getResources().getDisplayMetrics().density);
    }
}
