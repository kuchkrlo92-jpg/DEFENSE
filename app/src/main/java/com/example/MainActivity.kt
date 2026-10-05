package com.example

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.ConsoleMessage
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import android.net.Uri
import android.webkit.ValueCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
  private var fileUploadCallback: ValueCallback<Array<Uri>>? = null

  private val imagePickerLauncher = registerForActivityResult(
    ActivityResultContracts.GetContent()
  ) { uri: Uri? ->
    val results = if (uri != null) arrayOf(uri) else null
    fileUploadCallback?.onReceiveValue(results)
    fileUploadCallback = null
  }

  fun launchFileChooser(callback: ValueCallback<Array<Uri>>?): Boolean {
    fileUploadCallback?.onReceiveValue(null)
    fileUploadCallback = callback
    return try {
      imagePickerLauncher.launch("image/*")
      true
    } catch (e: Exception) {
      Log.e("MainActivity", "Failed to launch image picker", e)
      fileUploadCallback?.onReceiveValue(null)
      fileUploadCallback = null
      false
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme(darkTheme = true, dynamicColor = false) {
        Surface(
          modifier = Modifier.fillMaxSize(),
          color = MaterialTheme.colorScheme.background
        ) {
          TowerDefenseGameView(modifier = Modifier.fillMaxSize())
        }
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun TowerDefenseGameView(modifier: Modifier = Modifier) {
  var webViewKey by remember { mutableIntStateOf(0) }
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  var fallbackToSoftwareRendering by remember { mutableStateOf(false) }
  val lifecycleOwner = LocalLifecycleOwner.current

  DisposableEffect(lifecycleOwner, webViewInstance) {
    val observer = LifecycleEventObserver { _, event ->
      when (event) {
        Lifecycle.Event.ON_RESUME -> webViewInstance?.onResume()
        Lifecycle.Event.ON_PAUSE -> webViewInstance?.onPause()
        else -> Unit
      }
    }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose {
      lifecycleOwner.lifecycle.removeObserver(observer)
    }
  }

  BackHandler(enabled = webViewInstance?.canGoBack() == true) {
    webViewInstance?.goBack()
  }

  key(webViewKey) {
    AndroidView(
      modifier = modifier,
      factory = { context ->
        WebView(context).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )
          setBackgroundColor(Color.parseColor("#030712"))
          isFocusable = true
          isFocusableInTouchMode = true

          if (fallbackToSoftwareRendering) {
            setLayerType(View.LAYER_TYPE_SOFTWARE, null)
          }

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
            setSupportZoom(false)
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          }

          addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun closeApp() {
              val activity = (context as? android.app.Activity)
              activity?.runOnUiThread {
                activity.finishAndRemoveTask()
                activity.finishAffinity()
                android.os.Process.killProcess(android.os.Process.myPid())
              }
            }
          }, "AndroidBridge")

          webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
              super.onReceivedError(view, request, error)
              Log.w("TowerDefense", "WebResource error: ${error?.description} on ${request?.url}")
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              Log.d("TowerDefense", "Page finished loading: $url")
            }

            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
              val didCrash = detail?.didCrash() ?: false
              Log.w("TowerDefense", "Renderer process exited (crashed=$didCrash). Safely recreating WebView...")
              try {
                view?.destroy()
              } catch (e: Exception) {
                Log.e("TowerDefense", "Error releasing dead WebView", e)
              }
              if (didCrash) {
                fallbackToSoftwareRendering = true
              }
              webViewInstance = null
              webViewKey++
              return true
            }
          }

          webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
              consoleMessage?.let {
                Log.d("TowerDefenseJS", "[${it.messageLevel()}] ${it.message()} (${it.sourceId()}:${it.lineNumber()})")
              }
              return super.onConsoleMessage(consoleMessage)
            }

            override fun onShowFileChooser(
              webView: WebView?,
              filePathCallback: ValueCallback<Array<Uri>>?,
              fileChooserParams: FileChooserParams?
            ): Boolean {
              val activity = context as? MainActivity
              return activity?.launchFileChooser(filePathCallback) ?: run {
                filePathCallback?.onReceiveValue(null)
                false
              }
            }
          }

          loadUrl("file:///android_asset/index.html")
          webViewInstance = this
        }
      },
      update = { webView ->
        webViewInstance = webView
      },
      onRelease = { webView ->
        webViewInstance = null
        try {
          webView.stopLoading()
          webView.destroy()
        } catch (e: Exception) {
          Log.e("TowerDefense", "Error releasing WebView", e)
        }
      }
    )
  }
}

