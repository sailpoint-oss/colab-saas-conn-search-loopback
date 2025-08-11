import { ConnectorError, StandardCommand } from '@sailpoint/connector-sdk'
import { SearchLoopbackClient } from '../src/search-loopback-client'

const mockConfig: any = {
    token: 'xxx123'
}

describe('connector client unit tests', () => {

    const searchLoopbackClient = new SearchLoopbackClient(mockConfig)

    it('connector client list accounts', async () => {
        let allAccounts = await searchLoopbackClient.getAllAccounts()
        expect(allAccounts.length).toStrictEqual(2)
    })

    it('connector client get account', async () => {
        let account = await searchLoopbackClient.getAccount('john.doe')
        expect(account.username).toStrictEqual('john.doe')
    })

    it('connector client test connection', async () => {
        expect(await searchLoopbackClient.testConnection()).toStrictEqual({})
    })

    it('connector client test connection', async () => {
        expect(await searchLoopbackClient.testConnection()).toStrictEqual({})
    })

    it('invalid connector client', async () => {
        try {
            new searchLoopbackClient({})
        } catch (e) {
            expect(e instanceof ConnectorError).toBeTruthy()
        }
    })
})
