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