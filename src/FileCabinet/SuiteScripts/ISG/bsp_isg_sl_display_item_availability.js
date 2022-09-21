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
                let itemAvaibilityObj = {}
                //sample object
                let objRec = {
                    "header": {
                        "SprItemNum": "SPR15500<",
                        "UpcNumber": "035255155007<",
                        "ItemStatus": "A",
                        "ProductClass": "U",
                        "SellUom": "EA",
                        "ItemWeight": "5"
                    },
                    "item": [
                        {
                            "DcNum": "01",
                            "DcName": "ATLANTA",
                            "Available": 9,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        },
                        {
                            "DcNum": "03",
                            "DcName": "MIAMI",
                            "Available": 7,
                            "Uom": "EA"
                        }
                    ]
                }
                const endPointURL = "http://sprws.sprich.com/sprws/StockCheck.php"
                const headers = {}
                headers["Content-Type"] = "text/xml;charset=UTF-8"
                headers['User-Agent-x'] = 'bsp'
                headers["SOAPAction"] = "http://sprws.sprich.com/sprws/StockCheck.php?wsdl"
                headers["Connection"] = "keep-alive"

                //body Request
                const xmlStr = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"\n' +
                    '                                xmlns:stoc="http://sprws.sprich.com/sprws/StockCheck.php?wsdl">\n' +
                    '                                <soapenv:Header/>\n' +
                    '                                <soapenv:Body>\n' +
                    '                                <stoc:StockCheck>\n' +
                    '                                <input>\n' +
                    '                                <GroupCode>bspny</GroupCode>\n' +
                    '                                 <UserID>webserv</UserID>\n' +
                    '                                <Password>business12!</Password>\n' +
                    '                                <Action>F</Action>\n' +
                    '                               <CustNumber>your CustNumber goes here</CustNumber>\n' +
                    '                               <DcNumber></DcNumber>\n' +
                    '                               <ItemNumber>SPR15500</ItemNumber>\n' +
                    '                               <SortBy>N</SortBy>\n' +
                    '                               <MinInFullPacks></MinInFullPacks>\n' +
                    '                               <AvailableOnly>Y</AvailableOnly>\n' +
                    '                               </input>\n' +
                    '                               </stoc:StockCheck>\n' +
                    '                               </soapenv:Body>\n' +
                    '                               </soapenv:Envelope>'

                log.debug('xmlStr', xmlStr)
                try {
                    const res = N.http.post({
                        url: endPointURL,
                        headers: headers,
                        body: xmlStr
                    });

                    let xmlDocument = N.xml.Parser.fromString({
                        text: res.body
                    });
                    //convert XML document to JSON
                    let resBody = xmlToJson.xmlToJson(xmlDocument.documentElement)
                    log.debug('res.body JSON',resBody);
                    let returnStatus = resBody['SOAP-ENV:Body']['ns1:StockCheckResponse']['return']
                    let statusEntries = Object.entries(returnStatus)
                    //check the return Status and Code
                    let rtnStatusCode = statusEntries[1][1]
                    let rtnMessage = statusEntries[2][1]

                    log.debug('status',`Status Code: ${rtnStatusCode}, Message: ${rtnMessage}`);

                    // resBody.Envelope.Body.StockCheckResponse.return.ResultsRows.item.forEach((item)=>
                    //     itemAvaibilityObj.push(item)
                    // )

                } catch (e) {
                    log.error(e.message)
                }


                const form = serverWidget.createForm({
                    title: 'Item Stock Availability'
                });
                const xmlRequestBody = form.addField({
                    id: 'custpage_xml_request',
                    label: 'XML Body Request',
                    type: serverWidget.FieldType.TEXTAREA
                })

                xmlRequestBody.defaultValue = xmlStr
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
                var itemObj = consolidateItemData(objRec)
                log.debug('itemObj', itemObj[0].DcName)
                for (let i = 0; i < itemObj.length; i++) {

                    sublist.setSublistValue({
                        id: 'custpage_dcnum',
                        value: itemObj[i].DcNum,
                        line: i
                    });
                    sublist.setSublistValue({
                        id: 'custpage_dcname',
                        value: itemObj[i].DcName,
                        line: i
                    });
                    sublist.setSublistValue({
                        id: 'custpage_available',
                        value: itemObj[i].Available,
                        line: i
                    });
                    sublist.setSublistValue({
                        id: 'custpage_oum',
                        value: itemObj[i].Uom,
                        line: i
                    });


                }


                sublist.label = 'Result(' + sublist.lineCount + ')';
                context.response.writePage(form);
            } catch (e) {
                log.error(e.message)
            }
        }

        function consolidateItemData(data) {
            let itemData = []
            for (let item in data.item) {
                itemData.push(data.item[item])
            }
            return itemData
        }

        return {
            onRequest: onRequest
        };

    });