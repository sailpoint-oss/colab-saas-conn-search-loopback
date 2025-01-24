import {
    Context,
    ConnectorError,
    createConnector,
    readConfig,
    Response,
    logger,
    StdAccountListOutput,
    StdTestConnectionOutput,
    StdAccountListInput,
    StdTestConnectionInput,
    StdEntitlementListInput,
    StdEntitlementListOutput,
    StdEntitlementReadInput,
    StdEntitlementReadOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    ConnectorErrorType
} from '@sailpoint/connector-sdk'
import { SearchLoopbackClient } from './search-loopback-client'
import { Config } from './model/config'

// Connector must be exported as module property named connector
export const connector = async () => {
    // Get connector source config
    const config: Config = await readConfig()

    // Use the vendor SDK, or implement own client as necessary, to initialize a client
    const searchLoopbackClient = new SearchLoopbackClient(config)

    return createConnector()
        .stdTestConnection(
            async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
                try {
                    const response = await searchLoopbackClient.testConnection()
                    res.send({})
                } catch (e) {
                    throw new ConnectorError('Unable to connect to Identity Security Cloud')
                }
            }
        )
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            const accounts = await searchLoopbackClient.getAllAccounts()
            for (const account of accounts) {
                logger.info(account)
                res.send(account)
            }
            logger.info(`stdAccountList sent ${accounts.length} accounts`)
        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            const account = await searchLoopbackClient.getAccount(input.identity)
            logger.info(account)
            res.send(account)
        })
        .stdEntitlementList(async (context: Context, input: StdEntitlementListInput, res: Response<StdEntitlementListOutput>) => {
            const entitlements = searchLoopbackClient.getAllEntitlements()
            for (const entitlement of entitlements) {
                res.send(entitlement)
            }
            logger.info(`stdEntitlementList sent ${entitlements.length} entitlements`)
        })
        .stdEntitlementRead(async (context: Context, input: StdEntitlementReadInput, res: Response<StdEntitlementReadOutput>) => {
            const entitlement = searchLoopbackClient.getEntitlement(input.identity)
            res.send(entitlement)
            logger.info(`stdEntitlementRead read entitlement: ${input.identity}`)
        })
}
