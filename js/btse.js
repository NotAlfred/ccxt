'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { TICK_SIZE } = require ('./base/functions/number');
const { InvalidOrder } = require ('./base/errors');
// const { } = require ('./base/errors');

module.exports = class btse extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'btse',
            'name': 'BTSE',
            'countries': ['UAE'],
            'userAgent': 'sdk_ccxt/btse',
            'rateLimit': 3000,
            'has': {
                'CORS': true,
                'editOrder': false,
                'fetchOrder': true,
                'fetchOrders': false,
                'fetchOpenOrders': true,
                'fetchClosedOrders': true,
                'fetchMyTrades': false,
                'fetchTickers': true,
            },
            'timeframes': {
                '1m': '1',
                '3m': '3',
                '5m': '5',
                '15m': '15',
                '30m': '30',
                '1h': '60',
                '2h': '120',
                '4h': '240',
                '6h': '360',
                '9h': '720',
                '1d': '1440',
                '1M': '43800',
                '1w': '10080',
                '1Y': '525600',
            },
            'urls': {
                'test': 'https://testnet.btse.io',
                'logo': '',
                'api': {
                    'web': 'https://www.btse.com',
                    'api': 'https://api.btse.com',
                    'spotv2': 'https://api.btse.com/spot/api/v2',
                    'spotv3': 'https://api.btse.com/spot/api/v3.1',
                    'spotv3private': 'https://api.btse.com/spot/api/v3.1',
                    'futuresv2': 'https://api.btse.com/futures/api/v2.1',
                    'futuresv2private': 'https://api.btse.com/futures/api/v2.1',
                    'testnet': 'https://testapi.btse.io',
                },
                'www': 'https://www.btse.com',
                'doc': [
                    'https://www.btse.com/apiexplorer/futures/',
                    'https://www.btse.com/apiexplorer/spot/',
                ],
                'fees': 'https://support.btse.com/en/support/solutions/articles/43000064283-what-are-the-btse-trading-fees-',
                'referral': 'https://www.btse.com/ref?c=0Ze7BK',
            },
            'api': {
                'spotv2': {
                    'get': [
                        'time',
                        'market_summary',
                        'ticker/{id}/',
                        'orderbook/{id}',
                        'trades',
                        'account',
                        'ohlcv',
                    ],
                },
                'spotv3': {
                    'get': [
                        'time',
                        'market_summary', // get all markets
                        'orderbook/L2',
                        'trades',
                        'account',
                        'ohlcv',
                    ],
                },
                'spotv3private': {
                    'get': [
                        'user/fees',
                        'user/open_orders',
                        'user/trade_history',
                        'user/wallet',
                        'user/wallet_history',
                    ],
                    'post': [
                        'order',
                        'order/peg',
                        'order/cancelAllAfter',
                    ],
                    'delete': [
                        'order',
                    ],
                },
                'futuresv2': {
                    'get': [
                        'time',
                        'market_summary',
                        'orderbook/L2',
                        'ohlcv',
                        'trades',
                    ],
                },
                'futuresv2private': {
                    'get': [
                        'user/fees',
                        'user/open_orders',
                        'user/positions',
                        'user/trade_history',
                        'user/wallet',
                        'user/wallet_history',
                    ],
                    'post': [
                        'user/wallet_transfer',
                        'order',
                        'order/peg',
                        'order/close_position',
                        'order/cancelAllAfter',
                        'leverage',
                        'risk_limit',
                    ],
                    'delete': [
                        'order',
                    ],
                },
            },
            'fees': {
                'trading': {
                    'tierBased': false,
                    'percentage': true,
                    'taker': 0.060,
                    'maker': 0.0,
                },
            },
            'exceptions': {},
            'precisionMode': TICK_SIZE,
            'options': {
                'timeDifference': 0,
                'adjustTimeDifference': true,
                'fetchTickerQuotes': true,
            },
        });
    }

    nonce () {
        return this.milliseconds () - this.options['timeDifference'];
    }

    async loadTimeDifference () {
        const type = this.safeString2 (this.options, 'fetchTime', 'defaultType', 'spot');
        const method = (type === 'spot') ? 'spotv3GetTime' : 'futuresv2GetTime';
        // eslint-disable-next-line no-undef
        const response = await this[method];
        const after = this.milliseconds ();
        const serverTime = parseInt (response['epoch'] * 1000);
        this.options['timeDifference'] = parseInt (after - serverTime);
        return this.options['timeDifference'];
    }

    async fetchMarkets (params = {}) {
        const defaultType = this.safeString2 (this.options, 'GetMarketSummary', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const query = this.omit (params, 'type');
        const method = (type === 'spot') ? 'spotv3GetMarketSummary' : 'futuresv2GetMarketSummary';
        const response = await this[method] (query);
        const results = [];
        response.forEach ((market) => {
            const baseId = this.safeString (market, 'base');
            const quoteId = this.safeString (market, 'quote');
            const base = this.safeCurrencyCode (baseId);
            const quote = this.safeCurrencyCode (quoteId);
            results.push ({
                'id': this.safeValue (market, 'symbol'),
                'symbol': `${base}/${quote}`,
                base,
                quote,
                baseId,
                quoteId,
                'active': this.safeValue (market, 'active'),
                'precision': {
                    'price': this.safeFloat (market, 'minPriceIncrement'),
                    'amount': this.safeFloat (market, 'minSizeIncrement'),
                    'cost': undefined,
                },
                'limits': {
                    'amount': {
                        'min': this.safeFloat (market, 'minOrderSize'),
                        'max': this.safeFloat (market, 'maxOrderSize'),
                    },
                    'price': {
                        'min': this.safeFloat (market, 'minValidPrice'),
                        'max': undefined,
                    },
                    'cost': {
                        'min': undefined,
                        'max': undefined,
                    },
                },
                'info': market,
            });
        });
        return results;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const defaultType = this.safeString2 (this.options, 'GetMarketSummary', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3GetMarketSummary' : 'futuresv2GetMarketSummary';
        const request = {
            'symbol': market['id'],
        };
        const response = await this[method] (this.extend (request, params));
        return this.parseTicker (response[0]);
    }

    parseTicker (ticker) {
        return {
            'symbol': this.safeString (ticker, 'symbol'),
            'timestamp': this.milliseconds (),
            'high': this.safeFloat2 (ticker, 'high24Hr'),
            'low': this.safeFloat2 (ticker, 'low24Hr'),
            'bid': this.safeFloat (ticker, 'highestBid'),
            'bidVolume': undefined,
            'ask': this.safeFloat (ticker, 'lowestAsk'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': undefined,
            'last': this.safeFloat (ticker, 'last'),
            'previousClose': undefined,
            'change': undefined,
            'percentage': this.safeFloat (ticker, 'percentageChange'),
            'average': undefined,
            'baseVolume': undefined,
            'quoteVolume': this.safeFloat (ticker, 'volume'),
            'info': ticker,
        };
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
        };
        if (limit !== undefined) {
            request['depth'] = limit;
        }
        const defaultType = this.safeString2 (this.options, 'GetOrderBookL2', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3GetOrderbookL2' : 'futuresv2GetOrderbookL2';
        const response = await this[method] (this.extend (request, params));
        // {
        //     buyQuote: [
        //         { price: "7568.0", size: "1.026"}
        //     ],
        //     sellQuote: [
        //         { price: "21742.0", size: "3.970" }
        //     ],
        //     timestamp: 1587680929683,
        //     symbol: "BTC-USD",
        // }
        const timestamp = this.safeTimestamp (response, 'timestamp');
        const orderbook = this.parseOrderBook (response, timestamp, 'buyQuote', 'sellQuote', 'price', 'size');
        orderbook['nonce'] = this.safeInteger (response, 'timestamp');
        return orderbook;
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
        };
        if (limit !== undefined) {
            request['count'] = limit;
        }
        // [
        //     {
        //         price: 7467.5,
        //         size: 31,
        //         side: "BUY",
        //         symbol: "BTCPFC",
        //         serialId: 131840942,
        //         timestamp: 1587685195324,
        //     }
        // ]
        const defaultType = this.safeString2 (this.options, 'GetTrades', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3GetTrades' : 'futuresv2GetTrades';
        const response = await this[method] (this.extend (request, params));
        return this.parseTrades (response, market, since, limit);
    }

    parseTrade (trade, market) {
        const timestamp = this.safeValue (trade, 'timestamp');
        return {
            'id': this.safeString (trade, 'serialId'),
            'order': this.safeString (trade, 'orderID'),
            'symbol': market['symbol'],
            'price': this.safeFloat (trade, 'price'),
            'amount': this.safeFloat (trade, 'size'),
            'fee': this.safeFloat (trade, 'feeAmount'),
            'type': undefined,
            'datetime': this.iso8601 (timestamp),
            timestamp,
            'info': trade,
        };
    }

    async fetchDeposits (code = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const defaultType = this.safeString2 (this.options, 'GetWalletHistory', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3privateGetUserWalletHistory' : 'futuresv2privateGetUserWalletHistory';
        const response = await this[method] (this.extend (params));
        const deposits = [];
        response.forEach ((response) => {
            if (response['type'] === 'Deposit') {
                deposits.push (response);
            }
        });
        return deposits;
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        const defaultType = this.safeString2 (this.options, 'GetWallet', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3privateGetUserWallet' : 'futuresv2privateGetUserWallet';
        const response = await this[method] (this.extend (params));
        const result = {};
        // TODO different response parsing for futures
        response.forEach ((balance) => {
            const code = this.safeCurrencyCode (this.safeString (balance, 'currency'));
            const account = this.account ();
            account['total'] = this.safeFloat (balance, 'total');
            account['free'] = this.safeFloat (balance, 'available');
            account['used'] = account['total'] - this.safeFloat (balance, 'available');
            result[code] = account;
        });
        result['info'] = response;
        return this.parseBalance (result);
    }

    async fetchOHLCV (symbol, timeframe = '1h', since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
            'end': this.seconds (),
            'resolution': this.timeframes[timeframe],
        };
        if (since !== undefined) {
            request['start'] = since;
        }
        const defaultType = this.safeString2 (this.options, 'GetOhlcv', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3GetOhlcv' : 'futuresv2GetOhlcv';
        const response = await this[method] (this.extend (request, params));
        return this.parseOHLCVs (response, market['id'].toUpperCase (), timeframe, since, limit);
    }

    async createOrder (symbol, orderType, side, size, price = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'].toUpperCase (),
            'side': side.toUpperCase (),
            'size': parseFloat (this.amountToPrecision (symbol, size)),
            'time_in_force': 'GTC',
        };
        let priceToPrecision = undefined;
        if (price !== undefined) {
            priceToPrecision = parseFloat (this.priceToPrecision (symbol, price));
        }
        switch (orderType.toUpperCase ()) {
        case 'LIMIT':
            request['type'] = 'LIMIT';
            request['txType'] = 'LIMIT';
            request['price'] = priceToPrecision;
            break;
        case 'MARKET':
            request['type'] = 'MARKET';
            break;
        case 'STOP':
            request['txType'] = 'STOP';
            request['stopPrice'] = priceToPrecision;
            break;
        case 'TRAILINGSTOP':
            request['trailValue'] = priceToPrecision;
            break;
        default:
            throw new InvalidOrder (this.id + ' createOrder () does not support order type ' + orderType + ', only limit, market, stop, trailingStop, or takeProfit orders are supported');
        }
        const defaultType = this.safeString2 (this.options, 'PostOrder', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3privatePostOrder' : 'futuresv2privatePostOrder';
        const response = await this[method] (this.extend (request, params));
        return this.parseOrder (response[0]);
    }

    async cancelOrder (id, symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
            'orderID': id,
            'clOrderID': undefined,
        };
        const defaultType = this.safeString2 (this.options, 'DeleteOrder', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3privateDeleteOrder' : 'futuresv2privateDeleteOrder';
        const response = await this[method] (this.extend (request, params));
        if (response[0].message === 'ALL_ORDER_CANCELLED_SUCCESS') {
            return response[0];
        }
        return this.parseOrder (response[0]);
    }

    // TODO doesn't seem to actually cancel anything
    async cancelAllOrders (symbol = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            'timeout': 60000,
        };
        if (symbol !== undefined) {
            // TODO that part works but the call is INSANELY slow
            return this.cancelOrder (undefined, symbol);
        }
        const defaultType = this.safeString2 (this.options, 'OrderCancelAllAfter', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3privatePostOrderCancelAllAfter' : 'futuresv2privatePostOrderCancelAllAfter';
        const response = await this[method] (this.extend (request, params));
        return this.safeValue (response, 'result', {});
    }

    parseOrderStatus (status) {
        const statuses = {
            '2': 'created',
            '4': 'closed',
            '5': 'open',
            '6': 'canceled',
            '9': 'created',
            '10': 'open',
            '15': 'rejected',
            '16': 'rejected',
        };
        return this.safeString (statuses, status, status);
    }

    parseOrderType (type) {
        const types = {
            '76': 'limit',
            '77': 'market',
            '80': 'peg', // TODO figure out correct terminology
        };
        return this.safeString (types, type, type);
    }

    findSymbol (marketId, market) {
        if (market === undefined) {
            if (marketId in this.markets_by_id) {
                market = this.markets_by_id[marketId];
            } else {
                return marketId;
            }
        }
        return market['symbol'];
    }

    parseOrder (order, market = undefined) {
        const timestamp = this.safeValue (order, 'timestamp');
        const filled = this.safeFloat (order, 'fillSize');
        const amount = this.safeFloat (order, 'size');
        const remaining = amount - filled;
        const average = this.safeFloat (order, 'averageFillPrice');
        const price = this.safeFloat2 (order, 'price', 'triggerPrice', average);
        let cost = undefined;
        if (filled !== 0 && price !== undefined) {
            cost = filled * price;
        }
        return {
            'id': this.safeString (order, 'orderID'),
            timestamp,
            'datetime': this.iso8601 (timestamp),
            'lastTradeTimestamp': undefined,
            'symbol': this.findSymbol (this.safeString (order, 'symbol'), market),
            'type': this.parseOrderType (this.safeString (order, 'orderType')),
            'side': this.safeString (order, 'side'),
            price,
            amount,
            cost,
            average,
            filled,
            remaining,
            'status': this.parseOrderStatus (this.safeString (order, 'status')), // TODO they seem to have inconsistencies between orderState and status in between calls involving orders
            'fee': undefined,
            'trades': undefined,
            'info': order,
        };
    }

    async fetchOpenOrders (symbol, orderId, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
        };
        if (orderId !== undefined) {
            request['orderID'] = orderId;
        }
        const defaultType = this.safeString2 (this.options, 'GetUserOpenOrders', 'defaultType', 'spot');
        const type = this.safeString (params, 'type', defaultType);
        const method = (type === 'spot') ? 'spotv3privateGetUserOpenOrders' : 'futuresv2privateGetUserOpenOrders';
        const response = await this[method] (this.extend (request, params));
        return this.parseOrder (response[0]);
    }

    async fetchClosedOrders (symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
            'before': since,
            limit,
        };
        const orders = await this.spotv2privatePostFills (this.extend (request, params));
        return this.filterBy (orders, 'status', 'closed');
        // TODO needs double check
    }

    sign (path, api = 'api', method = 'GET', params = {}, headers = {}, body) {
        let url = this.urls['api'][api] + '/' + this.implodeParams (path, params);
        let bodyText = undefined;
        if (method === 'GET' || method === 'DELETE') {
            if (Object.keys (params).length) {
                url += '?' + this.urlencode (params);
            }
        }
        if (api.includes ('private')) {
            this.checkRequiredCredentials ();
            bodyText = JSON.stringify (params);
            const signaturePath = this.cleanSignaturePath (api, this.urls['api'][api] + '/' + path);
            headers = this.signHeaders (method, headers, signaturePath, bodyText);
        }
        body = (method === 'GET') ? null : bodyText;
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    signHeaders (method, headers, signaturePath, bodyText = undefined) {
        const nonce = this.nonce ();
        // eslint-disable-next-line init-declarations
        let signature;
        if (method === 'GET' || method === 'DELETE') {
            signature = this.createSignature (this.secret, nonce, signaturePath);
        } else {
            signature = this.createSignature (this.secret, nonce, signaturePath, bodyText);
        }
        headers['btse-nonce'] = nonce;
        headers['btse-api'] = this.apiKey;
        headers['btse-sign'] = signature;
        headers['Content-Type'] = 'application/json';
        return headers;
    }

    createSignature (key, nonce, path, body = undefined) {
        const content = body == null ? this.encode ('/' + path + nonce) : this.encode ('/' + path + nonce + body);
        return this.hmac (content, key, 'sha384');
    }

    cleanSignaturePath (api, url) {
        return (api === 'spotv3private')
            ? url.replace ('https://api.btse.com/spot/', '')
            : url.replace ('https://api.btse.com/futures/', '');
    }
};
