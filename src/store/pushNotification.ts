///<reference types="@types/node"/>
import PushNotificationService, {
  UnAuthorizedNotificationException,
  UnSupportedNotificationException,
} from "@/services/PushNotificationService"

enum pushNotificationState {
  OnError,
  Unsupported,
  Unauthorized,
  Initialized,
  Pending,
  AccountsRegistered,
}

export function pushNotificationStoreFactory(
  pushNotificationService: PushNotificationService
) {
  return {
    state: {
      token: "",
      storeState: pushNotificationState.Unsupported,
    },
    actions: {
      async initPushNotification({ commit, state }: any) {
        try {
          pushNotificationService.onRegistrationDo(
            (token: string): Promise<void> => {
              return new Promise((resolve, reject) => {
                commit("setToken", token)
              })
            }
          )
          await pushNotificationService.init()
          commit("setStoreState", pushNotificationState.Initialized)
          console.log(state.token)
        } catch (e) {
          if (e instanceof UnSupportedNotificationException) {
            console.log(e.message)
            commit("setStoreState", pushNotificationState.Unsupported)
          } else if (e instanceof UnAuthorizedNotificationException) {
            console.log(e.message)
            commit("setStoreState", pushNotificationState.Unauthorized)
          } else {
            console.error(e)
            commit("setStoreState", pushNotificationState.OnError)
          }
        }
      },
      async registerAccountsForPushNotification({
        commit,
        dispatch,
        rootGetters,
        state,
      }: any) {
        if (state.storeState >= pushNotificationState.Initialized) {
          commit("setStoreState", pushNotificationState.Pending)
          await dispatch("fetchAccounts")
          const accounts = rootGetters.activeVirtualAccounts
          await Promise.all(
            accounts.map((account: any) =>
              pushNotificationService.registerAccountForPushNotification(
                account.id,
                state.token
              )
            )
          )
          commit("setStoreState", pushNotificationState.AccountsRegistered)
        }
      },
    },
    mutations: {
      setToken(state: any, token: string) {
        state.token = token
      },
      setStoreState(state: any, storeState: pushNotificationState) {
        state.storeState = storeState
      },
    },
    getters: {
      getToken(state: any) {
        return state.token
      },
      getStoreState(state: any) {
        return state.storeState
      },
    },
  }
}
