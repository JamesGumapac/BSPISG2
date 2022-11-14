/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "./Lib/bsp_isg_spr_item_availability.js",
  
], function (serverWidget,itemAvailabilityUtil) {
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
      let rtnMessage = "";
      const tpName = context.request.parameters["tpName"];
      const tradingPartnerId = context.request.parameters["tradingParnerId"];
      const itemId = context.request.parameters["itemId"];
      const itemAvailabilityObj = itemAvailabilityUtil.getSprItemAvailabilityList(
        tradingPartnerId,
        itemId
      );
      //check if there is return error message
      if (itemAvailabilityObj[0].hasOwnProperty("returnMessage")) {
        rtnMessage = itemAvailabilityObj[0].returnMessage;
        context.response.write(`<html><h3>${rtnMessage}</h3></html>`);
      } else {
        context.response.writePage(
          createForm(
            itemAvailabilityObj[0].itemName,
            itemAvailabilityObj[0].itemAvaibilityList,
            tpName
          )
        );
      }
    } catch (e) {
      log.error(e.message);
    }
  }
  
  /**
   * This function get the item item availability list
   * @param tradingPartnerId
   * @param itemId
   * @returns {*[]}
   */
  // function getSprItemAvailabilityList(tradingPartnerId, itemId) {
  //   try {
  //     let rtnMessage;
  //     let itemName;
  //     let tpItemAvailabilityInfo = [];
  //     const tradingPartnerRec = record.load({
  //       type: "customrecord_bsp_isg_trading_partner",
  //       id: tradingPartnerId,
  //       isDynamic: true,
  //     });
  //     const itemNameSearch = search.lookupFields({
  //       type: search.Type.ITEM,
  //       id: itemId,
  //       columns: ["itemid"],
  //     });
  //     itemName = itemNameSearch["itemid"];
  //     tpItemAvailabilityInfo.push({
  //       tpGroupCode: tradingPartnerRec.getValue(
  //         "custrecord_bsp_isg_tp_group_code"
  //       ),
  //       tpUser: tradingPartnerRec.getValue("custrecord_bsp_isg_tp_user"),
  //       tpPassword: tradingPartnerRec.getValue(
  //         "custrecord_bsp_isg_tb_password"
  //       ),
  //       tpEndpoint: tradingPartnerRec.getValue(
  //         "custrecord_bsp_isg_ia_enpoint_url"
  //       ),
  //       tpSoapAction: tradingPartnerRec.getValue(
  //         "custrecord_bsp_isg_soap_action"
  //       ),
  //     });
  //
  //     const headers = {};
  //     //headers
  //     headers["Content-Type"] = "text/xml;charset=UTF-8";
  //     headers["User-Agent-x"] = tpItemAvailabilityInfo[0].tpGroupCode;
  //     headers["SOAPAction"] = tpItemAvailabilityInfo[0].tpSoapAction;
  //     headers["Connection"] = "keep-alive";
  //     //body Request
  //     const xmlStr = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  //                               xmlns:stoc="http://sprws.sprich.com/sprws/StockCheck.php?wsdl">
  //                               <soapenv:Header/>
  //                               <soapenv:Body>
  //                               <stoc:StockCheck>
  //                               <input>
  //                               <GroupCode>${tpItemAvailabilityInfo[0].tpGroupCode}</GroupCode>
  //                               <UserID>${tpItemAvailabilityInfo[0].tpUser}</UserID>
  //                               <Password>${tpItemAvailabilityInfo[0].tpPassword}</Password>
  //                               <Action>F</Action>
  //                               <CustNumber></CustNumber>
  //                               <DcNumber></DcNumber>
  //                               <ItemNumber>${itemName}</ItemNumber>
  //                               <SortBy>N</SortBy>
  //                               <MinInFullPacks></MinInFullPacks>
  //                               <AvailableOnly>Y</AvailableOnly>
  //                               </input>
  //                               </stoc:StockCheck>
  //                               </soapenv:Body>
  //                               </soapenv:Envelope>`;
  //
  //     const res = http.post({
  //       url: tpItemAvailabilityInfo[0].tpEndpoint,
  //       headers: headers,
  //       body: xmlStr,
  //     });
  //     if (res.code == !200) return;
  //     let xmlDocument = xml.Parser.fromString({
  //       text: res.body,
  //     });
  //
  //     let resBody = xmlToJson.xmlToJson(xmlDocument.documentElement);
  //
  //     let returnStatus =
  //       resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnStatus;
  //     rtnMessage =
  //       resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnMessage;
  //     const itemAvaibilityList = [];
  //     const returnObj = [];
  //     if (returnStatus !== "0000") {
  //       returnObj.push({
  //         returnMessage: rtnMessage,
  //       });
  //     } else {
  //       resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"][
  //         "ResultsRows"
  //       ].item.forEach((item) => itemAvaibilityList.push(item));
  //
  //       returnObj.push({
  //         itemName: itemName,
  //         itemAvaibilityList: itemAvaibilityList,
  //       });
  //     }
  //     return returnObj;
  //   } catch (e) {
  //     log.error("getSprItemAvailabilityList", e.message);
  //   }
  // }

  /**
   * Create Form
   * @param itemName
   * @param itemAvaibilityobj
   * @param tpName
   * @returns {Form}
   */
  function createForm(itemName, itemAvaibilityobj, tpName) {
    let itemAvaibilityList = [...itemAvaibilityobj];

    const form = serverWidget.createForm({
      title: `${tpName} Stock Availability`,
      hideNavBar: true,
    });
    form.addField({
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

    return form;
  }
  
  
  return {
    onRequest: onRequest,
  };
});
