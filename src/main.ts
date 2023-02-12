import { LocalStore } from "@lokavaluto/lokapi-browser"
import { createApp } from "vue"

import App from "./App.vue"
import { mkRouter } from "./router"
import store from "./store"
import { lokapiStoreFactory } from "./store/lokapi"
import { prefsStoreFactory } from "./store/prefs"
import { LokAPI } from "./services/lokapiService"

import {
  AuthService,
  PinAuthHandler,
  RetentionAuthHandler,
  DirectAuthHandler,
  PersistentConfigStore,
} from "./services/AuthService"

import PrefsService from "./services/PrefsService"

import AuthPrefs from "@/components/AuthPrefs.vue"

import AuthPrefDirect from "@/components/AuthPrefDirect.vue"
import AuthPrefRetention from "@/components/AuthPrefRetention.vue"
import AuthPrefPin from "@/components/AuthPrefPin.vue"

import AuthChallengeRetention from "@/components/AuthChallengeRetention.vue"
import AuthChallengeDirect from "@/components/AuthChallengeDirect.vue"
import AuthChallengePin from "@/components/AuthChallengePin.vue"

import Swal from "./useSwal"
import Loading from "./plugins/loading"
import "vue-loading-overlay/dist/vue-loading.css"
import "./polyfill"

import ToastService from "@/services/toastService"

import { library } from '@fortawesome/fontawesome-svg-core'
import { faEnvelope, faCheck, faLock, faLockOpen, faKey, faEdit, faSync, faArrowCircleUp, faArrowCircleDown, faPlusCircle, faSearch, faTriangleExclamation, faArrowLeft, faArrowRight, faStar } from '@fortawesome/free-solid-svg-icons'
import { faStar as farStar} from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
library.add(faEnvelope, faCheck, faLock, faLockOpen, faKey, faEdit, faSync, faArrowCircleUp, faArrowCircleDown, faPlusCircle, faSearch, faTriangleExclamation, faArrowLeft, faArrowRight, faStar, farStar)

require("@/assets/main.scss")
require("@/assets/native.scss")

async function fetchConfig(path: string) {
  let response: Response

  // This allows us to store the config given at build time
  // for the mobile apps compilation
  try {
    response = await fetch(path)
  } catch (error) {
    console.log(`Failed to load config file '${path}'.`)
    throw error
  }

  try {
    return JSON.parse(await response.text())
  } catch (error) {
    console.error(`File '${path}' was loaded, but doesn't contain valid json.`)
    throw error
  }
}

fetchConfig("config.json").then((config: any) => {
  if (!config.lokapiHost) {
    throw new Error("Please specify lokapiHost in 'config.json'")
  }

  const defaultAppName = require("../package.json").name
  const router = mkRouter(config.appName || defaultAppName)
  const lokApiService = new LokAPI(config.lokapiHost, config.lokapiDb)
  lokApiService.requestLogin = () => {
    const lastUrlSegment = window.location.href.split("/").pop()
    if (lastUrlSegment !== "carto" && lastUrlSegment !== "") {
      console.log("Login requested !")
      router.push("/")
    }
  }

  function calculateDaysBetweenDates(begin, end) {
    

  const root = document.querySelector(":root") as HTMLElement

  if (root !== null && typeof config.theme === "object") {
    Object.entries(config.theme).forEach(([key, value]: [string, any]) => {
      if (typeof value !== "string") {
        if (typeof value.toString !== "undefined") {
          value = value.toString()
        } else {
          console.warn(
            `Ignored invalid value for key '${key}' in config.json:`,
            value
          )
          return
        }
      }
      // Provide a simple way to refer to other variables in
      // ``config.json``, by using "$var" syntax.
      if (value.startsWith("$")) {
        value = `var(--${value.substring(1)})`
      }
      root.style.setProperty(`--${key}`, value)
    })
  }

  const authService = new AuthService(
    config?.localAuthPolicy,
    new PersistentConfigStore(lokApiService.persistentStore, "config"),
    {
      Pin: {
        Handler: PinAuthHandler,
        Ui: {
          Pref: AuthPrefPin,
          Challenge: AuthChallengePin,
        },
      },
      Direct: {
        Handler: DirectAuthHandler,
        Ui: {
          Pref: AuthPrefDirect,
          Challenge: AuthChallengeDirect,
        },
      },
      Retention: {
        Handler: RetentionAuthHandler,
        Ui: {
          Pref: AuthPrefRetention,
          Challenge: AuthChallengeRetention,
        },
      },
    }
  )

  const prefsService = new PrefsService()
  prefsService.register(async () => {
    const userAccounts = await lokApiService.getUserAccountsRequiringUnlock()
    if (userAccounts.length == 0) {
      return []
    }
    return [
      {
        component: AuthPrefs,
        data: {
          userAccountsRequiringAuth: userAccounts,
        },
      },
    ]
  })

  lokApiService.requestLocalPassword = async function (
    state: string,
    userAccount: any
  ) {
    if (store.state.requestLoadingAfterCreds && state === "failedUnlock") {
      app.config.globalProperties.$loading.hide()
    }
    const accountAuthService = await authService.getAccountAuth(
      userAccount.internalId
    )
    const creds = await accountAuthService.requestCredentials(state)
    if (store.state.requestLoadingAfterCreds) {
      app.config.globalProperties.$loading.show()
    }
    return creds
  }

  store.registerModule("lokapi", lokapiStoreFactory(lokApiService))
  store.registerModule("prefs", prefsStoreFactory(prefsService))

  const app = createApp(App)
  app.use(store)
  app.use(router)
  app.use(Swal)
  app.use(Loading)
  app.provide("$store", store)
  app.component("fa-icon", FontAwesomeIcon)
  app.config.globalProperties.$auth = authService
  app.config.globalProperties.$lokapi = lokApiService
  app.config.globalProperties.$config = config
  app.config.globalProperties.$msg = ToastService
  app.config.globalProperties.$persistentStore = new LocalStore("monujo")
  app.config.globalProperties.$auth = authService
  app.config.globalProperties.$prefs = prefsService
  app.mount("#app")
})
