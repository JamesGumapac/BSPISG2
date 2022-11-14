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
