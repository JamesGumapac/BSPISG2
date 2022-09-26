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
  "N/record",
], function (serverWidget, search, http, xmlToJson, xml, record) {
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
    let rtnMessage = "";
    let itemName = "";
    let tradingPartnerName = "";
    try {
      // TP = trading Partner
      let tpItemAvailabilityInfo = [];
      const tradingPartnerId = context.request.parameters["tradingParnerId"];
      tradingPartnerName = context.request.parameters["tpName"];
      log.debug("tradingPartnerName", tradingPartnerName);
      const itemId = context.request.parameters["itemId"];
      if (tradingPartnerId) {
        const tradingPartnerRec = record.load({
          type: "customrecord_bsp_isg_trading_partner",
          id: tradingPartnerId,
          isDynamic: true,
        });
        const itemNameSearch = search.lookupFields({
          type: search.Type.ITEM,
          id: itemId,
          columns: ["itemid"],
        });
        itemName = itemNameSearch["itemid"];
        tpItemAvailabilityInfo.push({
          tpGroupCode: tradingPartnerRec.getValue(
            "custrecord_bsp_isg_tp_group_code"
          ),
          tpUser: tradingPartnerRec.getValue("custrecord_bsp_isg_tp_user"),
          tpPassword: tradingPartnerRec.getValue(
            "custrecord_bsp_isg_tb_password"
          ),
          tpEndpoint: tradingPartnerRec.getValue(
            "custrecord_bsp_isg_ia_enpoint_url"
          )
        });
      }

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
                                <ItemNumber>${itemName}</ItemNumber>
                                <SortBy>N</SortBy>
                                <MinInFullPacks></MinInFullPacks>
                                <AvailableOnly>Y</AvailableOnly>
                                </input>
                                </stoc:StockCheck>
                                </soapenv:Body>
                                </soapenv:Envelope>`;

      const res = http.post({
        url: tpItemAvailabilityInfo[0].tpEndpoint,
        headers: headers,
        body: xmlStr,
      });
      if (res.code == !200) return;
      let xmlDocument = xml.Parser.fromString({
        text: res.body,
      });

      let resBody = xmlToJson.xmlToJson(xmlDocument.documentElement);

      let returnStatus =
        resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnStatus;
      rtnMessage =
        resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnMessage;

      log.debug("status", {
        returnStatus,
        rtnMessage,
      });

      let itemLength =
        resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"][
          "ResultsRows"
        ].item.length;
      if (itemLength > 0) {
        const itemAvaibilityList = [];
        resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"][
          "ResultsRows"
        ].item.forEach((item) => itemAvaibilityList.push(item));

        const form = serverWidget.createForm({
          title: `${tradingPartnerName} Stock Availability`,
          hideNavBar: true,
        });
        const item = form.addField({
          id: "custpage_itemname",
          label: "Item",
          type: serverWidget.FieldType.INLINEHTML,
        }).defaultValue = `<html><h1>Item Name: ${itemName}</h1></html>`;
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

        sublist.label = ` Total: ${sublist.lineCount} `;
        context.response.writePage(form);
      }
    } catch (e) {
      log.error(e.message);
      context.response.write(`<html><h3>${rtnMessage}</h3></html>`);
    }
  }

  return {
    onRequest: onRequest,
  };
});
