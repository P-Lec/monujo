<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <template v-if="step === 1">
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title is-title-shrink">
            Envoyer de l'argent - 1/2
          </p>
          <button
            class="delete"
            aria-label="close"
            @click="$emit('close')"
          ></button>
        </header>
        <div class="search-area">
          <div
            class="mt-4 is-flex is-justify-content-space-evenly is-align-items-center custom-search-bar"
          >
            <p class="control has-icons-left custom-search-bar">
              <input
                v-model="recipientsSearchString"
                @input="
                  (e) => {
                    ;(recipientsSearchString = e.target.value),
                      this.recipientsSearchString.length === 0 ||
                      this.recipientsSearchString.length >= 3
                        ? this.searchRecipients()
                        : null
                  }
                "
                class="input"
                type="text"
                placeholder="adresse mail, téléphone"
              />
              <span class="icon is-small is-left">
                <fa-icon icon="search" />
              </span>
            </p>
          </div>
          <div
            class="is-flex is-justify-content-space-evenly is-align-items-center mt-3"
          ></div>
          <div class="container is-fluid custom-heavy-line-separator"></div>
        </div>
        <section class="modal-card-body">
          <div v-if="recipientsLoading" class="loader-container">
            <loading
              v-model:active="recipientsLoading"
              :can-cancel="false"
              :is-full-page="false"
              :width="50"
              :height="50"
            />
          </div>
          <div
            v-else-if="recipientsSearchError"
            class="notification is-light is-danger"
          >
            Une erreur inattendue est survenue lors de la recherche de
            destinataires. Veuillez nous excuser pour la gêne occasionnée.
          </div>
          <div v-else>
            <div
              v-if="ownCurrenciesPartners.length !== 0"
              class="custom-card is-flex-direction-column is-align-items-center is-justify-content-space-between"
            >
              <template v-if="ownCurrenciesPartners">
                <div
                  class="is-clickable py-2"
                  v-for="(partner, index) in ownCurrenciesPartners"
                >
                  <PartnerItem
                    :partner="partner"
                    :key="index"
                    @select="handleClickRecipient(partner)"
                  />
                </div>
              </template>
            </div>
            <div
              v-else
              class="is-flex is-align-items-center is-justify-content-center"
            >
              Aucun destinataire de paiement a afficher
            </div>
          </div>
        </section>
        <footer class="modal-card-foot is-justify-content-flex-end">
          <!--  <button class="button is-success">Save changes</button>
        <button class="button">Cancel</button> -->
        </footer>
      </div>
    </template>

    <template v-if="step === 2 && selectedRecipient">
      <div class="modal-card">
        <header class="modal-card-head">
          <span class="is-flex is-flex-shrink-0">
            <a class="mr-3 is-flex" @click="step = 1">
              <span class="icon has-text-white">
                <fa-icon icon="arrow-left" class="fa-lg" />
              </span>
            </a>
          </span>
          <p class="modal-card-title is-title-shrink">
            Envoyer de l'argent - 2/2
          </p>
          <button
            class="delete"
            aria-label="close"
            @click="$emit('close')"
          ></button>
        </header>
        <section class="modal-card-body">
          <div
            class="is-flex is-flex-direction-column is-justify-content-space-evenly"
          >
            <div class="is-flex is-flex-direction-column custom-montant-input">
              <h2 class="frame3-sub-title mb-3">Depuis</h2>
              <BankAccountItem
                :bal="ownSelectedAccount.bal"
                :curr="ownSelectedAccount.curr"
                :backend="ownSelectedAccount.backend"
                :type="ownSelectedAccount.type"
                :active="ownSelectedAccount.active"
                class="mb-4"
              >
                <template v-slot:name>{{ ownSelectedAccount.name }}</template>
              </BankAccountItem>
              <h2 class="frame3-sub-title mb-3">Vers</h2>
              <PartnerItem :partner="selectedRecipient" />
              <h2 class="frame3-sub-title mt-3 mb-3">Montant</h2>
              <div class="is-flex">
                <input
                  v-model.number="amount"
                  ref="amountSend"
                  type="number"
                  min="0"
                  class="input is-custom"
                  placeholder="ex: 50"
                  :class="{
                    'is-danger': errors.balance || errors.amount,
                  }"
                />
                <div class="amount-currency-symbol pl-2">
                  {{ selectedRecipient.currencySymbol }}
                </div>
              </div>
              <div
                class="notification is-danger is-light"
                v-if="errors.balance"
              >
                {{ errors.balance }}
              </div>
              <div class="notification is-danger is-light" v-if="errors.amount">
                {{ errors.amount }}
              </div>
              <textarea
                v-model="message"
                class="custom-textarea textarea mt-5"
                placeholder="Ajoutez un texte (optionnel)"
              ></textarea>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot is-justify-content-flex-end">
          <button
            class="button custom-button custom-button-send-receive-money is-rounded action"
            @click="sendTransaction()"
          >
            Envoyer
          </button>
        </footer>
      </div>
    </template>
  </div>
</template>
<script lang="ts">
  import { Options, Vue } from "vue-class-component"
  import { e as LokapiExc } from "@lokavaluto/lokapi-browser"

  import Loading from "vue-loading-overlay"
  import "vue-loading-overlay/dist/vue-loading.css"
  import PartnerItem from "@/components/PartnerItem.vue"
  import BankAccountItem from "@/components/BankAccountItem.vue"

  @Options({
    name: "MoneyTransferModal",
    components: {
      Loading,
      PartnerItem,
      BankAccountItem,
    },
    data() {
      return {
        step: 1,
        partners: [],
        displayFavoritesOnly: false,
        recipientsLoading: false,
        recipientsSearchString: "",
        recipientsSearchError: false,
        selectedRecipient: null,
        ownSelectedAccount: null,
        amount: null,
        message: null,
        errors: {
          balance: false,
          amount: false,
        },
      }
    },
    mounted() {
      this.searchRecipients()
    },
    computed: {
      ownCurrenciesPartners(): Array<any> {
        let currencyIds = this.$store.getters.activeVirtualAccounts.map(
          (a: any) => a.currencyId
        )
        return this.partners.filter((p: any) => {
          return currencyIds.indexOf(p.backendId) > -1
        })
      },
    },
    methods: {
      async searchRecipients(): Promise<void> {
        this.partners = []
        this.recipientsSearchError = false
        var recipients
        try {
          this.recipientsLoading = true
          recipients = await this.$lokapi.searchRecipients(
            this.recipientsSearchString
          )
        } catch (err) {
          this.recipientsSearchError = true
          console.log("searchRecipients() Failed", err)
        }
        this.recipientsLoading = false
        this.partners = this.displayFavoritesOnly
          ? recipients.filter((r: any) => r.is_favorite === true)
          : recipients
      },
      async handleClickRecipient(recipient: any): Promise<void> {
        this.selectedRecipient = recipient
        this.selectedRecipient.currencySymbol = await recipient.getSymbol()
        this.ownSelectedAccount =
          this.$store.getters.activeVirtualAccounts.find(
            (va: any) => va.currencyId === recipient.backendId
          )
        this.step = 2
        this.errors.balance = false
        this.errors.amount = false
        this.setFocusSend()
      },
      async sendTransaction(): Promise<void> {
        this.errors.amount = false
        this.errors.balance = false
        if (this.amount <= 0) {
          this.errors.amount =
            "Le montant à transférer doit être un nombre positif"
          return
        }
        // This to ensure we are left with 2 decimals only
        this.amount = this.amount.toFixed(2)
        try {
          this.$store.commit("setRequestLoadingAfterCreds", true)
          await this.selectedRecipient.transfer(
            this.amount.toString(),
            this.message
          )
        } catch (err) {
          if (err instanceof LokapiExc.InsufficientBalance) {
            this.errors.balance =
              "Transaction refusée en raison de fonds insuffisants"
            return
          }
          if (err instanceof LokapiExc.InactiveAccount) {
            this.$msg.error(
              `Le compte destinataire du tranfert est désactivé.<br>` +
              `Vous ne pouvez pas lui envoyer de l'argent`
            )
            return
          }
          if (err.message === "User canceled the dialog box") {
            // A warning message should have already been sent
            return
          }
          this.$msg.error(
            `Une erreur inattendue est survenue pendant le transfert d'argent. ` +
              `Veuillez nous excuser pour la gêne occasionnée.<br>` +
              `Vous pouvez réessayer. Si l'erreur persiste, veuillez contacter votre administrateur.`
          )
          console.log("Payment failed:", err.message)
          throw err
        } finally {
          this.$loading.hide()
          this.$store.commit("setRequestLoadingAfterCreds", false)
        }
        this.errors.balance = false
        this.errors.amount = false
        this.$emit("close")

        this.$msg.success(`Paiement effectué à ${this.selectedRecipient.name}`)
        if (!this.selectedRecipient.is_favorite) {
          this.$Swal
            .fire({
              title: `Voulez vous ajouter ${this.selectedRecipient.name} aux favoris ?`,
              showDenyButton: true,
              confirmButtonText: `Ajouter`,
              denyButtonText: `Plus tard`,
            })
            .then(async (result: any) => {
              if (!result.isConfirmed) {
                if (await this.toggleFavorite(this.selectedRecipient)) {
                  this.$Swal.fire(
                    `${this.selectedRecipient.name} a bien été ajouté en favori`,
                    "",
                    "success"
                  )
                }
              }
            })
        }
        await this.$store.dispatch("fetchAccounts")
        await this.$store.dispatch("resetTransactions")
        this.searchName = ""
        this.partners = []
        this.amount = 0
        this.activeClass = 0
      },
      setFocusSend() {
        this.$nextTick(() => {
          this.$refs.amountSend.value = null
          this.$refs.amountSend.focus()
          this.$refs.amountSend.select()
        })
      },
    },
  })
  export default class MoneyTransferModal extends Vue {}
</script>
<style scoped lang="sass">
  .search-area
    background: #f0faf9

  .button.action
    white-space: normal
    height: auto
  .card-recipient-wrapper
    width: 90%
  .favorit-icon-wrapper
    width: 10%
  .modal-card-body
    min-height: 120px
  .loader-container
    position: relative
    height: 80px
  .amount-currency-symbol
    margin: auto
    font-size: 1.25em
    font-weight: bold
    line-height: 1em
    padding-bottom: calc(0.5em - 1px)
    padding-left: calc(0.75em - 1px)
    padding-right: calc(0.75em - 1px)
    padding-top: calc(0.5em - 1px)
  .w-100
    width: 100%
</style>