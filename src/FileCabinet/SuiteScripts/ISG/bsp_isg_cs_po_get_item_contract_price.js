/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/record", "N/search", "./Lib/bsp_isg_get_item_contract_plan.js"], /**
 * @param{record} record
 * @param{search} search
 * @param util
 */ function (record, search, util) {
  let isTP;

  function pageInit(context) {
    const currentRecord = context.currentRecord;
    let entity = currentRecord.getValue("entity");
    isTP = util.isTradingPartner(entity);
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
          console.log(" isTP " + isTP)
          for(let i = 0; i < currentRecord.getLineCount({sublistId: 'item'}); i++) {
           currentRecord.selectLine({sublistId: 'item',line: i})
            
            const itemId = currentRecord.getCurrentSublistValue({
              sublistId: "item",
              fieldId: "item",
              line: i
            });
           const quantity = currentRecord.getCurrentSublistValue({
             sublistId: "item",
             fieldId: "quantity",
             line: i
           });
            const cost = util.lookForContractCost(itemId, accountNumber);
            console.log("Cost: " + cost);
            if(cost){
              currentRecord.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: cost,
                ignoreFieldChange: true
              });
              currentRecord.setCurrentSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: Number(cost) * Number(quantity),
                ignoreFieldChange: true
              });
              currentRecord.commitLine({sublistId: "item"})
             // currentRecord.commitLine({sublistId: "item"})
              // currentRecord.setSublistValue({
              //   sublistId: "item",
              //   fieldId: "rate",
              //   line: i,
              //   value: cost,
              // });
        
            }
          
         
            console.log('FiledChanged Entity ItemId: ' + itemId);
          }
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
      log.error("fieldChanged", e.message);
    }
  }

  return {
    pageInit: pageInit,
    postSourcing: postSourcing,
  };
});
