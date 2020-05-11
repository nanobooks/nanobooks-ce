import * as React from 'react'
import * as CurrencyCodes from 'currency-codes'
import { Account, Actor } from '../core'

// Some utility functions to help with constructing select options

export function flatSelectOptions(items: any[]) {
    return <>
    {items.map(a => 
        <option key={a.id} value={a.id}>{a.title}</option>
    )}        
    </>
}

function groupedSelectOptions(groups: {[key: string]: any[]}, groupInfo: {[key: string]: {label: string}}) {
    return <>
    {Object.keys(groups).map((g) => {
        if (groups[g].length > 0) {
            return <optgroup key={g} label={groupInfo[g].label}>
                {flatSelectOptions(groups[g])}
            </optgroup>
        }
        else {
            return null
        }        
    })}
    </>
}

// Given a list of accounts, constructs a nested list of select options
export function accountSelectOptions(accounts: Account[], 
    groupInfo: {[key: string]: {label: string}} = Account.TypeGroupInfo) {
    const groups: {[key: string]: Account[]} = {}
    for (let k in groupInfo) {
        groups[k] = []
    }

    // Distribute accounts into each 'bucket'
    for (let a of accounts) {
        if (Array.isArray(groups[a.typeGroup])) {
            groups[a.typeGroup].push(a)
        }
    }

    return <>
        {groupedSelectOptions(groups, groupInfo)}
    </>
}

export function actorSelectOptions(actors: Actor[], optional = true) {
    const groups: any = {
        [Actor.Customer]: [],
        [Actor.Supplier]: [],
    }

    for (let a of actors) {
        groups[a.type!].push(a)
    }

    return <>
        {optional && <option key={0} value={0}>None</option>}
        {groupedSelectOptions(groups, Actor.TypeInfo)}
    </>
}

// Returns a list of currency select options, with the supplied values at the top
export function CurrencySelectOptions(props: {currencies: string[]}) {
    const currencies = props.currencies || []
    const selected: CurrencyCodes.CurrencyCodeRecord[] = []
    const rest: CurrencyCodes.CurrencyCodeRecord[] = []

    CurrencyCodes.data.forEach(c => {
        if (currencies.indexOf(c.code) >= 0) {
            selected.push(c)
        }
        else {
            rest.push(c)
        }
    })

    return <>
    {[...selected, ...rest].map(c =>
        <option key={c.code} value={c.code}>{c.code} - {c.currency}</option>
    )}
    </>
}
