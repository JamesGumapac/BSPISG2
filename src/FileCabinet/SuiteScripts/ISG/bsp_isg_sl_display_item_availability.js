/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "N/search",
  "N/http",
  "./Lib/xmlTojson.js",
  "N/xml",
], function (serverWidget, search, http, xmlToJson, xml) {
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
      // TP = trading Partner
      let tpItemAvailabilityInfo = [];
      const tradingPartnerId = context.request.parameters["tradingParnerId"];
      if (tradingPartnerId) {
        const tradingPartnerLookup = search.lookupFields({
          type: "customrecord_bsp_isg_trading_partner",
          id: tradingPartnerId,
          columns: [
            "custrecord_bsp_isg_tp_group_code",
            "custrecord_bsp_isg_tp_user",
            "custrecord_bsp_isg_tb_password",
          ],
        });


        tpItemAvailabilityInfo.push({
          tpGroupCode: tradingPartnerLookup["custrecord_bsp_isg_tp_group_code"],
          tpUser: tradingPartnerLookup["custrecord_bsp_isg_tp_user"],
          tpPassword: tradingPartnerLookup["custrecord_bsp_isg_tb_password"]
        });

        // TP = trading Partner
        log.debug(
          "TP Item Availability Info ",
          JSON.stringify(tpItemAvailabilityInfo)
        );
      }

      const endPointURL = "http://sprws.sprich.com/sprws/StockCheck.php";
      const headers = {};
      //headers
      headers["Content-Type"] = "text/xml;charset=UTF-8";
      headers["User-Agent-x"] = "bspny";
      headers["SOAPAction"] =
        "http://sprws.sprich.com/sprws/StockCheck.php?wsdl";
      headers["Connection"] = "keep-alive";

      //body Request
      const xmlStr = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                                xmlns:stoc="http://sprws.sprich.com/sprws/StockCheck.php?wsdl">
                                <soapenv:Header/>
                                <soapenv:Body>
                                <stoc:StockCheck>
                                <input>
                                <GroupCode>${tpItemAvailabilityInfo[0].tpGroupCode}</GroupCode>
                                <UserID>${tpItemAvailabilityInfo[0].tpUser}</UserID>
                                <Password>${tpItemAvailabilityInfo[0].tpPassword}</Password>
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
                                </soapenv:Envelope>`;

      const res = http.post({
        url: endPointURL,
        headers: headers,
        body: xmlStr,
      });

      let xmlDocument = xml.Parser.fromString({
        text: res.body,
      });

      let resBody = xmlToJson.xmlToJson(xmlDocument.documentElement);

      let returnStatus =
        resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnStatus;
      let rtnMessage =
        resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnMessage;

      log.debug("status", {
        returnStatus,
        rtnMessage,
      });
      const itemAvaibilityList = [];
      resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"][
        "ResultsRows"
      ].item.forEach((item) => itemAvaibilityList.push(item));
      log.debug("itemAvaibilityList", itemAvaibilityList);

      const form = serverWidget.createForm({
        title: "Item Stock Availability",
        hideNavBar: true,
      });

      const sublist = form.addSublist({
        id: "sublistid",
        type: serverWidget.SublistType.STATICLIST,
        label: "Result",
      });

      sublist.addRefreshButton();

      sublist.addField({
        id: "custpage_dcnum",
        label: "DC Number",
        type: serverWidget.FieldType.TEXT,
      });
      sublist.addField({
        id: "custpage_dcname",
        label: "DC NAME",
        type: serverWidget.FieldType.TEXT,
      });
      sublist.addField({
        id: "custpage_available",
        label: "Available Quantity",
        type: serverWidget.FieldType.INTEGER,
      });
      sublist.addField({
        id: "custpage_oum",
        label: "UOM",
        type: serverWidget.FieldType.TEXT,
      });

      for (let i = 0; i < itemAvaibilityList.length; i++) {
        sublist.setSublistValue({
          id: "custpage_dcnum",
          value: itemAvaibilityList[i].DcNum,
          line: i,
        });
        sublist.setSublistValue({
          id: "custpage_dcname",
          value: itemAvaibilityList[i].DcName,
          line: i,
        });
        sublist.setSublistValue({
          id: "custpage_available",
          value: itemAvaibilityList[i].Available,
          line: i,
        });
        sublist.setSublistValue({
          id: "custpage_oum",
          value: itemAvaibilityList[i].Uom,
          line: i,
        });
      }

      sublist.label = "Result(" + sublist.lineCount + ")";
      context.response.writePage(form);
    } catch (e) {
      log.error(e.message);
    }
  }

  return {
    onRequest: onRequest,
  };
});
