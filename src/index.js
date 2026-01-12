import 'core-js';
import 'normalize.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { isMobile } from './utils';
import { setLocale, setTranslations } from 'react-i18nify';
import i18n from './i18n';
import App from './App';
import Mobile from './Mobile';
import GlobalStyle from './GlobalStyle';

setTranslations(i18n);
const language = navigator.language.toLowerCase();
// Default to English unless user explicitly sets otherwise (though this logic just sets initial)
// User requirement: "Default English"
const defaultLang = 'en'; 
setLocale(defaultLang);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <React.Fragment>
        <GlobalStyle />
        {isMobile ? <Mobile /> : <App defaultLang={defaultLang} />}
    </React.Fragment>
);
