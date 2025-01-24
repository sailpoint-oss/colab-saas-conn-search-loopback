import { Attributes, StdAccountReadOutput } from '@sailpoint/connector-sdk'
import { IdentityDocument } from 'sailpoint-api-client'

export class SearchAccount implements StdAccountReadOutput {
    identity: string
    uuid: string
    attributes: Attributes
    disabled: boolean
    locked: boolean
    IIQDisabled: boolean

    constructor(identity: IdentityDocument, entitlementList: string[], isManagerEntitlement?:boolean) {
        if (isManagerEntitlement != null && isManagerEntitlement) {
            this.attributes = {
                id: identity.manager?.id ? identity.manager?.id : '',
                displayName: identity.manager?.displayName ? identity.manager?.displayName : '',
                employeeNumber: identity.attributes?.managerEmployeeNumber ? identity.attributes?.managerEmployeeNumber : '',
                uid: identity.manager?.name ? identity.manager?.name : '',
                entitlements: entitlementList ? entitlementList : []
            }
        } else {
            this.attributes = {
                id: identity.id ? identity.id : '',
                displayName: identity.displayName ? identity.displayName : '',
                employeeNumber: identity.employeeNumber ? identity.employeeNumber : '',
                uid: identity.name ? identity.name : '',
                entitlements: entitlementList ? entitlementList : []
            }
        }
        this.locked = false
        this.disabled = true
        this.IIQDisabled = true
        this.identity = this.attributes.id as string
        this.uuid = this.attributes.id as string
    }

    addEntitlement(entitlementName: string) {
        let accountEntitlements = this.attributes.entitlements as string[]
        accountEntitlements.push(entitlementName)
        this.attributes.entitlements = accountEntitlements
        return this
    }

    hasEntitlement(entitlementName: string) {
        let accountEntitlements = this.attributes.entitlements as string[]
        for (const entitlement of accountEntitlements) {
            if (entitlement === entitlementName) {
                return true
            }
        }
        return false
    }
}