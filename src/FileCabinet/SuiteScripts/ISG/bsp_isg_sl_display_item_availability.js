/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N', './Lib/xmlTojson.js', 'N/xml'],

    function (serverWidget, search, N, xmlToJson, xml) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object}
         *                context
         * @param {ServerRequest}
         *                context.request - Encapsulation of the incoming request
         * @param {ServerResponse}
         *                context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */


        function onRequest(context) {
            try {

                let itemAvaibilityObj = []
                //sample object
                let objRec = {
                    "Envelope": {
                        "Body": {
                            "StockCheckResponse": {
                                "return": {
                                    "ErrorMessage": "",
                                    "RtnError": "",
                                    "RtnMessage": "OK",
                                    "SprItemNum": "SPR15500",
                                    "StripNumber": "SPR15500",
                                    "UpcNumber": 35255155007,
                                    "OldNumber": "",
                                    "ItemStatus": "A",
                                    "ProductClass": "U",
                                    "Description": "BOX,CASH,W/TRAY,2X15X10.5",
                                    "SellUom": "EA",
                                    "CatalogPage": 426,
                                    "MatrixPage": "",
                                    "ItemWeight": 5,
                                    "ItemCubes": 0.28,
                                    "BrokenQtyAllowed": "Y",
                                    "InfoProcessing": "N",
                                    "ReadyAssemble": "N",
                                    "Furniture": "N",
                                    "DatedGoods": "N",
                                    "CountryOfOrigin": "CN",
                                    "ServiceSupply": "N",
                                    "NoReturn": "N",
                                    "SpecialOrder": "N",
                                    "UpsShippable": "Y",
                                    "HazmatMessage": "No",
                                    "RetailPrice": 64.5,
                                    "RetailUom": "EA",
                                    "MatrixPrice": "",
                                    "MatrixUom": "",
                                    "CurrencyCode": "USA",
                                    "OrderMinimum": 1,
                                    "UpchargeMessage": "No",
                                    "ResultsRows": {
                                        "item": [
                                            {
                                                "DcNum": 1,
                                                "DcName": "ATLANTA",
                                                "Available": 9,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "H",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 3,
                                                "DcName": "MIAMI",
                                                "Available": 7,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 4,
                                                "DcName": "TAMPA",
                                                "Available": 11,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 5,
                                                "DcName": "DALLAS",
                                                "Available": 5,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 6,
                                                "DcName": "MEMPHIS",
                                                "Available": 8,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 7,
                                                "DcName": "KANSAS CITY",
                                                "Available": 9,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 8,
                                                "DcName": "HOUSTON",
                                                "Available": 12,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 9,
                                                "DcName": "COLUMBUS",
                                                "Available": 6,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 11,
                                                "DcName": "DENVER",
                                                "Available": 1,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 12,
                                                "DcName": "RICHMOND",
                                                "Available": 3,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 13,
                                                "DcName": "OKLAHOMA CITY",
                                                "Available": 23,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 15,
                                                "DcName": "SAN ANTONIO",
                                                "Available": 2,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 16,
                                                "DcName": "BIRMINGHAM",
                                                "Available": 19,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "Y",
                                                "CutOff": "05:30 pm",
                                                "LeadTime": 1,
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 17,
                                                "DcName": "NEW ORLEANS",
                                                "Available": 4,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 18,
                                                "DcName": "ST. LOUIS",
                                                "Available": 5,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 19,
                                                "DcName": "BALTIMORE",
                                                "Available": 15,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 20,
                                                "DcName": "ORLANDO",
                                                "Available": 4,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 22,
                                                "DcName": "GREENSBORO",
                                                "Available": 10,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "Y",
                                                "CutOff": "05:00 pm",
                                                "LeadTime": 3,
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 24,
                                                "DcName": "INDIANAPOLIS",
                                                "Available": 6,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 26,
                                                "DcName": "NASHVILLE",
                                                "Available": 12,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "Y",
                                                "CutOff": "05:00 pm",
                                                "LeadTime": 3,
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 27,
                                                "DcName": "JACKSONVILLE",
                                                "Available": 12,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 28,
                                                "DcName": "SEATTLE",
                                                "Available": 8,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 29,
                                                "DcName": "SYRACUSE",
                                                "Available": 7,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 30,
                                                "DcName": "SACRAMENTO",
                                                "Available": 5,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 31,
                                                "DcName": "LOS ANGELES",
                                                "Available": 16,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 33,
                                                "DcName": "SALT LAKE CITY",
                                                "Available": 11,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 34,
                                                "DcName": "BOSTON",
                                                "Available": 3,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 35,
                                                "DcName": "CHICAGO",
                                                "Available": 7,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 36,
                                                "DcName": "PHOENIX",
                                                "Available": 8,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 38,
                                                "DcName": "PITTSBURGH",
                                                "Available": 2,
                                                "Uom": "EA",
                                                "OnOrder": 0,
                                                "Expected": "",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 39,
                                                "DcName": "GRAND RAPIDS",
                                                "Available": 1,
                                                "Uom": "EA",
                                                "OnOrder": 4,
                                                "Expected": 2,
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "ALL"
                                            },
                                            {
                                                "DcNum": 60,
                                                "DcName": "ATLANTA RDC",
                                                "Available": 140,
                                                "Uom": "EA",
                                                "OnOrder": 600,
                                                "Expected": "DUE",
                                                "Sprinter": "",
                                                "CutOff": "",
                                                "LeadTime": "",
                                                "DcType": "RDC"
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }

                const endPointURL = "http://sprws.sprich.com/sprws/StockCheck.php"
                const headers = {}
                //headers
                headers["Content-Type"] = "text/xml;charset=UTF-8"
                headers['User-Agent-x'] = 'bspny'
                headers["SOAPAction"] = "http://sprws.sprich.com/sprws/StockCheck.php?wsdl"
                headers["Connection"] = "keep-alive"

                //body Request
                const xmlStr = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                                xmlns:stoc="http://sprws.sprich.com/sprws/StockCheck.php?wsdl">
                                <soapenv:Header/>
                                <soapenv:Body>
                                <stoc:StockCheck>
                                <input>
                                <GroupCode>bspny</GroupCode>
                                <UserID>webserv</UserID>
                                <Password>business12!</Password>
                                <Action>F</Action>
                                <CustNumber></CustNumber>
                                <DcNumber></DcNumber>
                                <ItemNumber>SPR314</ItemNumber>
                                <SortBy>N</SortBy>
                                <MinInFullPacks></MinInFullPacks>
                                <AvailableOnly>Y</AvailableOnly>
                                </input>
                                </stoc:StockCheck>
                                </soapenv:Body>
                                </soapenv:Envelope>`


                try {
                    const res = N.http.post({
                        url: endPointURL,
                        headers: headers,
                        body: xmlStr
                    });

                    let xmlDocument = N.xml.Parser.fromString({
                        text: res.body
                    });
                    log.debug('xml document', xmlDocument)
                    var resBody = xmlToJson.xmlToJson(xmlDocument.documentElement)
                    // log.debug('res.body JSON', resBody['SOAP-ENV:Body']['ns1:StockCheckResponse']['return']['ResultsRows']);

                    let returnStatus = resBody['SOAP-ENV:Body']['ns1:StockCheckResponse']['return'].RtnStatus;
                    let rtnMessage = resBody['SOAP-ENV:Body']['ns1:StockCheckResponse']['return'].RtnMessage;

                    log.debug('status', `Status Code: ${returnStatus}, Message: ${rtnMessage}`);

                    resBody['SOAP-ENV:Body']['ns1:StockCheckResponse']['return']['ResultsRows'].item.forEach((item) =>
                        itemAvaibilityObj.push(item)
                    )
                    log.debug('itemAvaibilityObj', itemAvaibilityObj)


                } catch (e) {
                    log.error(e.message)
                }


                const form = serverWidget.createForm({
                    title: 'Item Stock Availability',
                    hideNavBar: true
                });


                const sublist = form.addSublist({
                    id: 'sublistid',
                    type: serverWidget.SublistType.STATICLIST,
                    label: 'Result'
                });

                sublist.addRefreshButton();


                sublist.addField({
                    id: 'custpage_dcnum',
                    label: 'DC Number',
                    type: serverWidget.FieldType.TEXT
                })
                sublist.addField({
                    id: 'custpage_dcname',
                    label: 'DC NAME',
                    type: serverWidget.FieldType.TEXT
                })
                sublist.addField({
                    id: 'custpage_available',
                    label: 'Available Quantity',
                    type: serverWidget.FieldType.INTEGER
                })
                sublist.addField({
                    id: 'custpage_oum',
                    label: 'UOM',
                    type: serverWidget.FieldType.TEXT
                })


                for (let i = 0; i < itemAvaibilityObj.length; i++) {

                    sublist.setSublistValue({
                        id: 'custpage_dcnum',
                        value: itemAvaibilityObj[i].DcNum,
                        line: i
                    });
                    sublist.setSublistValue({
                        id: 'custpage_dcname',
                        value: itemAvaibilityObj[i].DcName,
                        line: i
                    });
                    sublist.setSublistValue({
                        id: 'custpage_available',
                        value: itemAvaibilityObj[i].Available,
                        line: i
                    });
                    sublist.setSublistValue({
                        id: 'custpage_oum',
                        value: itemAvaibilityObj[i].Uom,
                        line: i
                    });


                }


                sublist.label = 'Result(' + sublist.lineCount + ')';
                context.response.writePage(form);
            } catch (e) {
                log.error(e.message)
            }
        }


        return {
            onRequest: onRequest
        };

    });