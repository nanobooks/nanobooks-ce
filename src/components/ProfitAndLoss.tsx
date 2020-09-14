/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Document, Page, View } from '@react-pdf/renderer'
import { PDFView, Styles, Tr, Th, ThLeft, ThRight, Td, TdLeft, TdRight } from './PDFView'
import { Transaction, formatDateOnly, toFormattedAbs,
    Money, ProfitAndLoss, profitAndLoss, datePresetDates } from '../core'
import { CURRENCY_TOTALS_WRAP, DateRange, ReportHeader } from './Reports'

export function ProfitAndLossDetail() {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [info, setInfo] = React.useState<ProfitAndLoss>()

    function onPresetChange(e: any) {
        const value = e.target.value
        setPreset(value)

        if (value != 'custom') {
            const range = datePresetDates(value)
            setStartDate(range[0])
            setEndDate(range[1])
        }
    }

    function onDateChange(startDate: string, endDate: string) {
        setStartDate(startDate)
        setEndDate(endDate)
    }

    React.useEffect(() => {
        if (startDate && endDate) {
            profitAndLoss(startDate, endDate).then(data => {
                setInfo(data)
            })
        }
    }, [startDate, endDate])

    const report = React.useMemo(() => {
        return info ? <Document><Page size="A4" style={[Styles.page, {fontSize: 9}]}>
            <View fixed={true}>
                <ReportHeader startDate={info.startDate} endDate={info.endDate} title='Profit and Loss: Detail' />
                <Tr key='header' style={{marginBottom: 6}}>
                    <ThLeft width={18} innerStyle={{borderBottomWidth: 1}}>Item</ThLeft>
                    <ThLeft width={11} innerStyle={{borderBottomWidth: 1}}>Date</ThLeft>
                    <ThLeft width={20} innerStyle={{borderBottomWidth: 1}}>Name</ThLeft>
                    <Th width={34} innerStyle={{borderBottomWidth: 1}}>Description</Th>
                    <ThRight width={17} innerStyle={{borderBottomWidth: 1}}>Amount</ThRight>
                </Tr>
            </View>

            {info.hasOperations ? <DivisionDetail
                label='Ordinary revenue / expense'
                netLabel='Earnings before interest, tax, depreciation and amortisation (EBITDA)'
                division={info.operations} 
            /> : <>
                <Tr key='label' style={{marginBottom: 3}}><Th width={100}>Ordinary revenue / expense</Th></Tr>
                <Tr key='none'><Td indent={2} width={98}>No items</Td></Tr>
            </>}

            {info.hasDepreciation && <DivisionDetail
                label='Depreciation and amortisation'
                netLabel='Net depreciation and amortisation'
                division={info.depreciation} 
            />}
            <Totals key='ebit' totals={info.ebit} label='Earnings before interest and tax (EBIT)' />

            {info.hasInterestTax && <DivisionDetail
                label='Interest and tax'
                netLabel='Net interest and tax'
                division={info.interestTax} 
            />}
            <Totals key='netProfit' totals={info.netProfit} label='Net profit' />
        </Page></Document> : null
    }, [info])

    return <div>
        <h1><span className='title'>Profit and Loss: Detail</span></h1>
        <div>
            <span className='date-preset'>
                <label htmlFor='preset'>Date:</label>
                <select name='preset' value={preset} onChange={onPresetChange}>
                    {!preset && <option key='' value=''></option>}
                    <option key='this-month' value='this-month'>This month</option>
                    <option key='this-quarter' value='this-quarter'>This quarter</option>
                    <option key='this-year' value='this-year'>This financial year</option>
                    <option key='prev-month' value='prev-month'>Last month</option>
                    <option key='prev-quarter' value='prev-quarter'>Last quarter</option>
                    <option key='prev-year' value='prev-year'>Last financial year</option>
                    <option key='custom' value='custom'>Custom date range</option>
                </select>
            </span>
            {preset == 'custom' && <DateRange onChange={onDateChange} startDate={startDate} endDate={endDate} />}
        </div>

        {report && <PDFView filename='profit-and-loss-detail.pdf'>{report}</PDFView>}
    </div>
}

type DivisionProps = {
    label: string
    netLabel: string
    division: ProfitAndLoss['operations']
}

function DivisionDetail({label, netLabel, division}: DivisionProps) {
    return <>
        <Tr key='label' style={{marginBottom: 3}}><Th width={100}>{label}</Th></Tr>
 
        {division.revenues.groups.length > 0 && <Tr key='revenue' style={{marginBottom: 3}}><Th indent={2} width={98}>Revenue</Th></Tr>}
        {division.revenues.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            <Tr key='group-title' style={{marginBottom: 3}}><Th indent={4} width={96}>{group.accountTitle}</Th></Tr>
            {group.items.map((item, index) => {
                return <Tr key={item.id}>
                    <TdLeft width={14} indent={4}>{Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}</TdLeft>
                    <Td width={11} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                    <TdLeft width={20} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
                    <Td width={34} innerStyle={{maxLines: 2}}>{
                        !item.txnDescription ? item.description :
                        !item.description ? item.txnDescription :
                        `${item.txnDescription}: ${item.description}`
                    }</Td>
                    <TdRight width={17} innerStyle={index == group.items.length - 1 ? {
                        marginBottom: 3,
                        paddingBottom: 3,
                        borderBottomWidth: 1,
                    } : {}}>{toFormattedAbs(item.amount, item.currency)} {item.currency}</TdRight>
                </Tr>
            })}

            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 12,
                    } : {}}>
                    <TdLeft width={79} indent={4}>
                        {index == 0 ? `Total ${group.accountTitle}` : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.revenues.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.revenues.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.revenues.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={81} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Revenue' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        {division.expenses.groups.length > 0 && <Tr key='expenses' style={{marginBottom: 3}}><Th indent={2} width={98}>Expenses</Th></Tr>}
        {division.expenses.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            <Tr key='group-title' style={{marginBottom: 3}}><Th indent={4} width={96}>{group.accountTitle}</Th></Tr>
            {group.items.map((item, index) => {
                return <Tr key={item.id}>
                    <TdLeft width={14} indent={4}>{Transaction.TypeInfo[item.txnType].shortLabel} {item.txnId}</TdLeft>
                    <Td width={11} innerStyle={{marginRight: 6, textAlign: 'right'}}>{formatDateOnly(item.txnDate)}</Td>
                    <TdLeft width={20} innerStyle={{maxLines: 1}}>{item.actorTitle}</TdLeft>
                    <Td width={34} innerStyle={{maxLines: 2}}>{
                        !item.txnDescription ? item.description :
                        !item.description ? item.txnDescription :
                        `${item.txnDescription}: ${item.description}`
                    }</Td>
                    <TdRight width={17} innerStyle={index == group.items.length - 1 ? {
                        marginBottom: 3,
                        paddingBottom: 3,
                        borderBottomWidth: 1,
                    } : {}}>{toFormattedAbs(item.amount, item.currency)} {item.currency}</TdRight>
                </Tr>
            })}

            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 12,
                    } : {}}>
                    <TdLeft width={79} indent={4}>
                        {index == 0 ? `Total ${group.accountTitle}` : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.expenses.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.expenses.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.expenses.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={81} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Expenses' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        <Totals totals={division.netTotals} label={netLabel} />
    </>
}

type TotalsProps = {
    label: string
    totals: Money[]
    width?: number
}

function Totals({label, totals, width = 100}: TotalsProps) {
    // Keep totals together unless there are a lot of currencies
    return <View wrap={totals.length > CURRENCY_TOTALS_WRAP} style={{marginBottom: 12}}>
        {totals.map((money, index) => {
            return <Tr key={money.currency}>
                <ThLeft width={width - 15} style={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 2,
                    borderColor: '#fff', // transparent
                } : {}} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 2,
                    borderColor: '#fff', // transparent
                    position: 'absolute',
                } : {}}>{index == 0 ? `${label}` : ''}</ThLeft>
                <ThRight width={15} style={{
                    borderTopWidth: index == 0 ? 2 : 0,
                    paddingTop: index == 0 ? 3 : 0,
                    borderBottomWidth: index == totals.length-1 ? 2 : 0,
                    paddingBottom: index == totals.length-1 ? 3 : 0,
                }}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
    </View>
}

export function ProfitAndLossSummary() {
    const [preset, setPreset] = React.useState<string>('')
    const [startDate, setStartDate] = React.useState<string>('')
    const [endDate, setEndDate] = React.useState<string>('')
    const [info, setInfo] = React.useState<ProfitAndLoss>()

    function onPresetChange(e: any) {
        const value = e.target.value
        setPreset(value)

        if (value != 'custom') {
            const range = datePresetDates(value)
            setStartDate(range[0])
            setEndDate(range[1])
        }
    }

    function onDateChange(startDate: string, endDate: string) {
        setStartDate(startDate)
        setEndDate(endDate)
    }

    React.useEffect(() => {
        if (startDate && endDate) {
            profitAndLoss(startDate, endDate).then(data => {
                setInfo(data)
            })
        }
    }, [startDate, endDate])

    const report = React.useMemo(() => {
        return info ? <Document><Page size="A4" style={[Styles.page, {fontSize: 9}]}>
            <View fixed={true}>
                <ReportHeader startDate={info.startDate} endDate={info.endDate} title='Profit and Loss: Summary' />
            </View>

            {info.hasOperations ? <DivisionSummary
                label='Ordinary revenue / expense'
                netLabel='Earnings before interest, tax, depreciation and amortisation (EBITDA)'
                division={info.operations} 
            /> : <>
                <Tr key='label' style={{marginBottom: 3}}><Th width={60}>Ordinary revenue / expense</Th></Tr>
                <Tr key='none'><Td indent={2} width={58}>No items</Td></Tr>
            </>}

            {info.hasDepreciation && <DivisionSummary
                label='Depreciation and amortisation'
                netLabel='Net depreciation and amortisation'
                division={info.depreciation} 
            />}
            <Totals key='ebit' totals={info.ebit} width={60} label='Earnings before interest and tax (EBIT)' />

            {info.hasInterestTax && <DivisionSummary
                label='Interest and tax'
                netLabel='Net interest and tax'
                division={info.interestTax} 
            />}
            <Totals key='netProfit' totals={info.netProfit} width={60} label='Net profit' />
        </Page></Document> : null
    }, [info])

    return <div>
        <h1><span className='title'>Profit and Loss: Summary</span></h1>
        <div>
            <span className='date-preset'>
                <label htmlFor='preset'>Date:</label>
                <select name='preset' value={preset} onChange={onPresetChange}>
                    {!preset && <option key='' value=''></option>}
                    <option key='this-month' value='this-month'>This month</option>
                    <option key='this-quarter' value='this-quarter'>This quarter</option>
                    <option key='this-year' value='this-year'>This financial year</option>
                    <option key='prev-month' value='prev-month'>Last month</option>
                    <option key='prev-quarter' value='prev-quarter'>Last quarter</option>
                    <option key='prev-year' value='prev-year'>Last financial year</option>
                    <option key='custom' value='custom'>Custom date range</option>
                </select>
            </span>
            {preset == 'custom' && <DateRange onChange={onDateChange} startDate={startDate} endDate={endDate} />}
        </div>

        {report && <PDFView filename='profit-and-loss-detail.pdf'>{report}</PDFView>}
    </div>
}

function DivisionSummary({label, netLabel, division}: DivisionProps) {
    return <>
        <Tr key='label' style={{marginBottom: 3}}><Th width={60}>{label}</Th></Tr>
 
        {division.revenues.groups.length > 0 && <Tr key='revenue' style={{marginBottom: 3}}><Th indent={2} width={58}>Revenue</Th></Tr>}
        {division.revenues.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 3,
                    } : {}}>
                    <TdLeft width={39} indent={4}>
                        {index == 0 ? group.accountTitle : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.revenues.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.revenues.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.revenues.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={41} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Revenue' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        {division.expenses.groups.length > 0 && <Tr key='expenses' style={{marginBottom: 3}}><Th indent={2} width={58}>Expenses</Th></Tr>}
        {division.expenses.groups.map(group => <React.Fragment key={`group-${group.accountId}`}>
            {group.totals.map((money, index) => {
                return <Tr key={money.currency} style={index == group.totals.length - 1 ? {
                        marginBottom: 3,
                    } : {}}>
                    <TdLeft width={39} indent={4}>
                        {index == 0 ? group.accountTitle : ''}
                    </TdLeft>
                    <TdRight width={17}>
                        {toFormattedAbs(money.amount, money.currency)} {money.currency}
                    </TdRight>
                </Tr>
            })}
        </React.Fragment>)}

        <View wrap={division.expenses.totals.length > CURRENCY_TOTALS_WRAP}>
        {division.expenses.totals.map((money, index) => {
            return <Tr key={money.currency} style={index == division.expenses.totals.length-1 ? {
                marginBottom: 12,
            } : {}}>
                <ThLeft width={41} indent={2} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                    borderColor: '#fff', // transparent
                } : {}}>{index == 0 ? 'Total Expenses' : ''}</ThLeft>
                <ThRight width={17} innerStyle={index == 0 ? {
                    paddingTop: 3,
                    borderTopWidth: 1,
                } : {}}>
                    {toFormattedAbs(money.amount, money.currency)} {money.currency}
                </ThRight>
            </Tr>
        })}
        </View>

        <Totals totals={division.netTotals} label={netLabel} width={60}/>
    </>
}