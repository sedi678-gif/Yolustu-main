import Script from 'next/script';

const THEME_INIT = `(function(){try{var k=Object.keys(localStorage).filter(function(x){return x.indexOf('yolustu_user_settings_v1_')===0;});var theme='dark';for(var i=0;i<k.length;i++){var raw=localStorage.getItem(k[i]);if(!raw)continue;var s=JSON.parse(raw);if(s&&s.appearance&&s.appearance.theme){theme=s.appearance.theme;break;}}var resolved=theme;if(theme==='system'){resolved=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}else if(theme==='light'){resolved='light';}else{resolved='dark';}document.documentElement.setAttribute('data-theme',resolved);document.documentElement.style.colorScheme=resolved;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export function ThemeInitScript() {
  return (
    <Script id="theme-init" strategy="beforeInteractive">
      {THEME_INIT}
    </Script>
  );
}
