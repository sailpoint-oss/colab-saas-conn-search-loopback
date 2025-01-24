import { ConnectorError, ConnectorErrorType, logger } from '@sailpoint/connector-sdk'
import { Configuration, Search, Paginator } from 'sailpoint-api-client'
import {
    IdentityDocument,
    PublicIdentitiesApi,
    PublicIdentitiesApiGetPublicIdentitiesRequest,
    SearchApi,
    SearchApiSearchPostRequest
} from 'sailpoint-api-client/dist/v3'
import axiosRetry from 'axios-retry'
import { SearchAccount } from './model/account'
import { SearchEntitlement } from './model/entitlement'
import { InvalidConfigurationError } from './errors/invalid-configuration-error'

const TOKEN_URL_PATH = '/oauth/token'

export class SearchLoopbackClient {
    private readonly apiConfig: Configuration
    private readonly entitlements: SearchEntitlement[]

    constructor(config: any) {
        // configure sailpoint api credentials
        if (config.clientId == null) {
            throw new InvalidConfigurationError(`client id must be provided from config`)
        }
        if (config.clientSecret == null) {
            throw new InvalidConfigurationError(`client secret must be provided from config`)
        }
        if (config.baseurl == null) {
            throw new InvalidConfigurationError(`client secret must be provided from config`)
        }
        const tokenUrl = new URL(config.baseurl).origin + TOKEN_URL_PATH
        this.apiConfig = new Configuration({ ...config, tokenUrl })

        // axios retry config
        this.apiConfig.retriesConfig = {
            retries: 5,
            retryDelay: (retryCount, error) => axiosRetry.exponentialDelay(retryCount, error, 2000),
            retryCondition: (error) => {
                return (
                    axiosRetry.isNetworkError(error) ||
                    axiosRetry.isRetryableError(error) ||
                    error.response?.status === 429
                )
            },
            onRetry: (retryCount, error, requestConfig) => {
                logger.debug(
                    `Retrying API [${requestConfig.url}] due to request error: [${error}]. Try number [${retryCount}]`
                )
            },
        }

        // read in entitlements from config
        this.entitlements = []
        let entitlementMappings = config?.entitlementMappings
        if (entitlementMappings != null) {
            for (const name of Object.keys(entitlementMappings)) {
                const query = entitlementMappings[name]
                if (!name || !query) {
                    throw new InvalidConfigurationError(`an entitlement mapping is configured incorrectly`)
                }
                this.entitlements.push(new SearchEntitlement(name, query))
            }
        }
    }

    async getAllAccounts(): Promise<SearchAccount[]> {
        let accountsMap = new Map<string, SearchAccount>()
        const searchApi = new SearchApi(this.apiConfig)
        const searchTemplate: Search = {
            indices: ['identities'],
            query: {
                query: '',
            },
            sort: ['-id'],
            queryResultFilter: {
                includes: ['id', 'employeeNumber', 'displayName', 'inactive', 'attributes.managerEmployeeNumber', 'manager', 'name'],
            },
        }

        for (const entitlement of this.entitlements) {
            // try to avoid using "as" here
            const entName = entitlement.attributes.name as string
            const entQuery = entitlement.attributes.query as string
            if (entName && entQuery) {
                const isManagerEntitlement: boolean = entName.endsWith('_manager')
                searchTemplate.query!.query = entQuery
                searchTemplate.searchAfter = []
                console.log(entQuery)
                const response = await Paginator.paginateSearchApi(searchApi, searchTemplate).catch(function (error) {
                    throw new ConnectorError(`Failed to query: ${entQuery}`)
                })
                let identityList = response.data
                if (identityList) {
                    for (const identity of identityList) {
                        const castedIdentity = identity as IdentityDocument
                        const idToCheck = isManagerEntitlement && castedIdentity.manager && castedIdentity.manager.id ? castedIdentity.manager.id : castedIdentity.id!
                        let account: SearchAccount
                        if (!accountsMap.has(idToCheck)) {
                            account = new SearchAccount(castedIdentity, [entName], isManagerEntitlement)
                        } else {
                            account = accountsMap.get(idToCheck)!
                            if (!account.hasEntitlement(entName)) {
                                account = account.addEntitlement(entName)
                            }
                        }
                        accountsMap.set(idToCheck, account)
                    }
                }
            }
        }
        return Array.from(accountsMap.values())
    }

    async getAccount(id: string): Promise<SearchAccount> {
        const searchApi = new SearchApi(this.apiConfig)
        const searchTemplate: SearchApiSearchPostRequest = {
            search: {
                indices: ['identities'],
                query: {
                    query: '',
                },
                sort: ['-id'],
                queryResultFilter: {
                    includes: ['id', 'employeeNumber', 'displayName', 'inactive', 'attributes.managerEmployeeNumber', 'manager', 'name'],
                },
            },
            offset: 0,
            limit: 1,
        }
        let account: SearchAccount | undefined
        for (const entitlement of this.entitlements) {
            const entName = entitlement.attributes.name as string
            const entQuery = entitlement.attributes.query as string
            if (entName && entQuery && id) {
                const isManagerEntitlement: boolean = entName.endsWith('_manager')
                searchTemplate.search.query!.query = entQuery + ` AND id:\"${id}\"`
                searchTemplate.search.searchAfter = []
                const response = await searchApi.searchPost(searchTemplate).catch(function (error) {
                    throw new ConnectorError(`single account aggregation failed to query: ${entQuery}`)
                })
                const identityResponse = response.data
                if (identityResponse && identityResponse.length > 0) {
                    const castedIdentityResponse = identityResponse[0] as IdentityDocument
                    if (account && !account.hasEntitlement(entName)) {
                        account.addEntitlement(entName)
                    } else {
                        account = new SearchAccount(castedIdentityResponse, [entName], isManagerEntitlement)
                    }
                }
            }
        }
        if (account === undefined) {
            throw new ConnectorError(`account not found for ${id}`, ConnectorErrorType.NotFound)
        }
        return account
    }

    async testConnection() {
        const api = new PublicIdentitiesApi(this.apiConfig)
        const params: PublicIdentitiesApiGetPublicIdentitiesRequest = {
            'limit': 1
        }
        const response = await api.getPublicIdentities(params).catch(function (error) {
            console.log(error)
            throw new ConnectorError(`Failed to connect to SailPoint API`)
        })
        return response
    }

    getAllEntitlements(): SearchEntitlement[] {
        return this.entitlements
    }

    getEntitlement(name: string): SearchEntitlement {
        if (name) {
            for (const entitlement of this.entitlements) {
                if (entitlement.attributes.name === name) {
                    return entitlement
                }
            }
        }
        throw new ConnectorError(`Unable to find a matching entitlement mapping for ${name}`)
    }
}
