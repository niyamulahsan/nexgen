import "@/plugins/axios";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createHead } from "@vueuse/head";
import { DialogPlugin } from "@/plugins/dialog";
import { PulsePlugin } from "@/plugins/pulse";
import { GumPlugin } from "@/plugins/gum";

import App from "./App.vue";
import router from "./router";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "@/assets/scss/custom.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const app = createApp(App);
const pinia = createPinia();
const head = createHead({ titleTemplate: (title) => (title ? `${title} | Nexgen` : "Nexgen") });

app.use(pinia);
app.use(router);
app.use(head);
app.use(DialogPlugin);
app.use(GumPlugin);
app.use(PulsePlugin);
app.mount("#app");
