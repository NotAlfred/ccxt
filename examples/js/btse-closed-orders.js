"use strict";

const ccxt      = require ('../../ccxt.js')
const asTable   = require ('as-table')
const log       = require ('ololog').configure ({ locate: false })

(async function() {
    const exchange = new ccxt.btse ({
        'apiKey': 'MjIyOGU1NDAyOWVkNDI4Njg1ZWVjMzMwY2E1YzZhOTQ=',
        'secret': 'M2I5NTMzZGE4MGViNDIy',
    });

    const symbol = 'BTC-PFC'; // edit here

    const params = {}        // edit here

    let order = await exchange.fetchClosedOrders (symbol, undefined, undefined)
    console.log (order)
}) ()