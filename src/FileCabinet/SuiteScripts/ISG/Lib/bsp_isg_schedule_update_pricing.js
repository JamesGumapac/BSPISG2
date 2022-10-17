/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/search", "N/record"], function (search, record) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}
  function getSpRichardsItemPricingObj(fileObj) {
    const pricingToProcess = [];
    const itemObj = []
    const iterator = fileObj.lines.iterator();
    iterator.each(function (line) {
      const initialLineValue = line.value.replace(/;/g, '');
      const lineValues = initialLineValue.split(",");
      itemObj.push(lineValues)
      const itemId = lineValues[2];
      const description = lineValues[3];
      const OUM = lineValues[6];
      const price = lineValues[31];
      const cost = lineValues[77];
      const contractCode = lineValues[101];
      pricingToProcess.push({
        itemId: itemId,
        description: description,
        OUM: OUM,
        price: price,
        cost: cost,
        contractCode: contractCode,
      });
      return true;
    });
    pricingToProcess.shift()
    //return object and remove the first element
    return pricingToProcess;
  }
  /**
   * This function maps the column line for essendant and iterate each line and return the object
   * @param {*} fileObj - file Object
   */
  function getEssendantItemPricingObj(fileObj) {
    const pricingToProcess = [];
    const itemObj = []
    const iterator = fileObj.lines.iterator();
    iterator.each(function (line) {
      const initialLineValue = line.value.replace(/"/g, '');
      const lineValues = initialLineValue.split(",");
      itemObj.push(lineValues)
      const itemId = lineValues[0];
      const description = lineValues[7];
      const OUM = lineValues[8];
      const price = lineValues[10];
      const cost = lineValues[9];
      const contractCode = lineValues[17];
      pricingToProcess.push({
        itemId: itemId,
        description: description,
        OUM: OUM,
        price: price,
        cost: cost,
        contractCode: contractCode,
      });
      return true;
    });
    pricingToProcess.shift()
 
    //return object and remove the first element of the array
    return pricingToProcess;
  }

  /**
   * This function check if the item ID exist
   * @param {*} itemId
   */
  function checkItemId(itemId) {
    let itemIdResults = false;
    const itemSearchObj = search.create({
      type: "item",
      filters: [["name", "is", itemId]],
      columns: [
        search.createColumn({ name: "internalid", label: "Internal ID" }),
      ],
    });
    const searchResultCount = itemSearchObj.runPaged().count;

    itemSearchObj.run().each(function (result) {
      itemIdResults = result.id;
      return true;
    });
    return itemIdResults;
  }
function moveFolderToDone(fileId, folderId) {

}
  /**
   * This update the item and item contract plan
   * @param {*} itemId
   * @param {*} contractCode
   * @param {*} purchasePrice
   * @param {*} cost
   * @param {*} vendor
   */
  function updateItemAndContractPlan(
    itemId,
    contractCode,
    purchasePrice,
    cost,
    vendor
  ) {
    const itemRec = record.load({
      type: record.Type.INVENTORY_ITEM,
      id: itemId,
      isDynamic: true,
    });
    const vendorLine = itemRec.findSublistLineWithValue({
      sublistId: "itemvendor",
      fieldId: "vendor",
      value: vendor,
    });
    const vendorCodeLine = itemRec.findSublistLineWithValue({
      sublistId: "itemvendor",
      fieldId: "vendorcode",
      value: contractCode.toString(),
    });
    console.log(vendorCodeLine + ": " + vendorLine);
    if (vendorLine === vendorCodeLine) {
      itemRec.selectLine({
        sublistId: "itemvendor",
        line: vendorLine,
      });
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "purchaseprice",
        value: purchasePrice,
      });
      itemRec.commitLine({
        sublistId: "itemvendor",
      });
    } else if (vendorLine === -1) {
      //if vendor line is not found create line for vendor and contractCode
      itemRec.selectNewLine({
        sublistId: "itemvendor",
      });
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "vendor",
        value: vendor,
      });
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "vendorcode",
        value: contractCode,
      });
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "purchaseprice",
        value: purchasePrice,
      });
      itemRec.commitLine({
        sublistId: "itemvendor",
      });
    }
    const itemRecId = itemRec.save({
      ignoreMandatoryFields: true,
    });

    const itemContractPlan = updateItemContractPlanPirce(
      itemId,
      contractCode,
      purchasePrice,
      cost
    );

    log.debug("item and contract plan", { itemRecId, itemContractPlan });
  }

  function updateItemContractPlanPirce(
    itemId,
    contractCode,
    purchasePrice,
    cost
  ) {
    let itemContractPlanId = "";
    const contractPlanSearch = search.create({
      type: "customrecord_bsp_isg_item_acct_data",
      filters: [
        ["custrecord_bsp_isg_parent_item.internalid", "anyof", itemId],
        "AND",
        ["custrecord_bsp_isg_item_contract_code.name", "is", contractCode],
      ],
    });
    const searchResultCount = contractPlanSearch.runPaged().count;
    if(searchResultCount <= 0) return false
    contractPlanSearch.run().each(function (result) {
      itemContractPlanId = result.id;
      return true;
    });
    return record.submitFields({
      type: "customrecord_bsp_isg_item_acct_data",
      id: itemContractPlanId,
      value: "custrecord_bsp_isg_item_price",
      purchasePrice,
      custrecord_bsp_isg_item_cost: cost,
    });
  }

  function createItem(itemId, purchasePrice, cost, description) {
    const itemRec = record.create({
      type: "inventoryitem",
      isDynamic: true,
    });

    if (purchasePrice) {
      itemRec.setValue({
        fieldId: "purchaseunit",
        value: purchasePrice,
      });
    }

    if (description) {
      itemRec.setValue({
        fieldId: "description",
        value: description,
      });
    }

    itemRec.setValue({
      fieldId: "itemid",
      value: itemId,
    });

    itemRec.setValue({
      fieldId: "isonline",
      value: false,
    });
    log.debug("Item Record ", itemRec);
   // return itemRec.save({ ignoreErrors: true });
  }

  return {
    pageInit: pageInit,
    getEssendantItemPricingObj: getEssendantItemPricingObj,
    getSpRichardsItemPricingObj: getSpRichardsItemPricingObj,
    checkItemId: checkItemId,
    updateItemAndContractPlan: updateItemAndContractPlan,
    createItem:createItem
    
  };
});
