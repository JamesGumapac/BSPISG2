/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/ui/message",
  "N/record",
  "N/search",
  "./Lib/bsp_isg_get_item_contract_plan.js",
], /**
 * @param message
 * @param{record} record
 * @param{search} search
 * @param util
 */ function (message, record, search, util) {
  let isTP;
  function pageInit(context) {
    const currentRecord = context.currentRecord;
    let entity = currentRecord.getValue("entity");
    if (entity) {
      isTP = util.isTradingPartner(entity);
    }
  }

  function postSourcing(context) {
    try {
      const currentRecord = context.currentRecord;
      let accountNumber;
      let fieldId = context.fieldId;
      let sublistId = context.sublistId;
      let entity = currentRecord.getValue("entity");

      if (fieldId === "entity") {
        isTP = util.isTradingPartner(entity);
        if (isTP === true) {
          const tpRecId = util.getTradingPartnerID(entity);
          accountNumber = util.getTpAccountCartonBuy(tpRecId);
          accountNumber &&
            currentRecord.setValue({
              fieldId: "custbody_bsp_isg_transmission_acct_num",
              value: accountNumber,
            });
          showMessage();
          //Update all item rate based in the contract cost of the trading partner
          setTimeout(function () {
           
            for (
              let i = 0;
              i < currentRecord.getLineCount({ sublistId: "item" });
              i++
            ) {
              currentRecord.selectLine({ sublistId: "item", line: i });
              const itemId = currentRecord.getCurrentSublistValue({
                sublistId: "item",
                fieldId: "item",
              });

              const cost = util.lookForContractCost(itemId, accountNumber);
              if (!cost) continue;
              currentRecord.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: cost,
                ignoreFieldChange: false,
              });

              currentRecord.commitLine({
                sublistId: "item",
                ignoreRecalc: false,
              });
            }
          }, 1000);
        }
      }

      if (sublistId === "item" && fieldId === "item") {
        if (isTP === false) return;
        let itemAccountNumber = currentRecord.getValue(
          "custbody_bsp_isg_transmission_acct_num"
        );
        const itemId = currentRecord.getCurrentSublistValue({
          sublistId: "item",
          fieldId: "item",
        });
        const cost = util.lookForContractCost(itemId, itemAccountNumber);
        currentRecord.setCurrentSublistValue({
          sublistId: "item",
          fieldId: "rate",
          value: cost,
        });
      }
    } catch (e) {
      log.error("postSourcing", e.message);
    }
  }

  function showMessage() {
    const infoMessage = message.create({
      title: "INFORMATION",
      message: "UPDATING ITEM RATE",
      type: message.Type.INFORMATION,
    });
    infoMessage.show();
  }

  return {
    pageInit: pageInit,
    postSourcing: postSourcing,
  };
});
