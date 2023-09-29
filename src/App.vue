<template>
  <TheNavBar />
  <Modal />
  <Dialog />
  <AuthChallenge />
  <router-view />
</template>

<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import Dialog from "@/components/Dialog.vue"
  import Modal from "@/components/Modal.vue"
  import AuthChallenge from "@/components/AuthChallenge.vue"
  import TheNavBar from "@/components/TheNavBar.vue"
  import { Capacitor } from "@capacitor/core"
  import { StatusBar, Style } from "@capacitor/status-bar"
  import { App as CapacitorApp } from "@capacitor/app"
  import { mapGetters } from 'vuex';

  @Options({
    components: { TheNavBar, AuthChallenge, Dialog, Modal },
    async mounted() {
      if (Capacitor.getPlatform() === "ios") {
        await StatusBar.setStyle({ style: Style.Light })
      }
      CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (this.$modal.isActive.value) {
          this.$modal.back()
          return
        }
        if (canGoBack) {
          window.history.back()
        } else {
          CapacitorApp.exitApp()
        }
      })
    },
    watch: {
      $route(to, from) {
        if (this.$modal.isActive.value) this.$modal.close()
      },
      activeVirtualAccounts(to, from) {
        if (to.length > 0) {
          let areAccountsEqual = true;
          if (to.length !== from.length) {
            areAccountsEqual = false;
          } else {
            for (let i = 0; i < to.length; i++) {
              if (to[i].id !== from[i].id) {
                areAccountsEqual = false;
                break;
              }
            }
          }
          if (!areAccountsEqual) {
            this.$store.dispatch("registerAccountsForPushNotification")
          }
        }
      }
    },
    computed: {
      userProfile(): string {
        return this.$store.state.lokapi.userProfile
      },
      ...mapGetters(["activeVirtualAccounts"]),
    },
  })
  export default class Login extends Vue {}
</script>

<style lang="scss"></style>
