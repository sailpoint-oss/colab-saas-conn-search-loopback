import { Attributes, StdEntitlementReadOutput } from "@sailpoint/connector-sdk";

export class SearchEntitlement implements StdEntitlementReadOutput {
    identity: string
    uuid: string
    type: string = 'group'
    attributes: Attributes

    constructor(name:string, query:string) {
        this.attributes = {
            name: name ? name : '',
            query: query ? query : ''
        }
        this.identity = this.attributes.name as string
        this.uuid = this.attributes.name as string
    }

    // TO DO: Could add a method here to do simple syntax checking on the provided query
    // call it in constructor to catch syntax errors before moving to account aggregations
}
