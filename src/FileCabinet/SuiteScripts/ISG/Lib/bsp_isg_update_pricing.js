/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/search", "N/record", "N/task"], function (
  file,
  search,
  record,
  task
) {
  /**
   * This function maps the column line for SPR and iterate each line and return the line object
   * @param {*} fileObj - CSV file Object
   * @param {*} accountNumber
   */
  function getSpRichardsItemPricingObj(fileObj, accountNumber) {
    try {
      const pricingToProcess = [];

      const iterator = fileObj.lines.iterator();
      iterator.each(function (line) {
        const initialLineValue = line.value.replace(/;/g, "");
        const lineValues = initialLineValue.split(",");
        const itemId = lineValues[2];
        const description = lineValues[3];
        const OUM = lineValues[6];
        const price = lineValues[31];
        const itemWeight = lineValues[20];
        const minimumQty = lineValues[76];
        const cost = lineValues[77];
        const contractCode = lineValues[101];
        pricingToProcess.push({
          accountNumber: accountNumber,
          itemId: itemId,
          description: description,
          OUM: OUM,
          itemWeight: itemWeight,
          minimumQty: minimumQty,
          price: price,
          cost: cost,
          contractCode: contractCode,
        });
        return true;
      });
      pricingToProcess.shift();
      //return object and remove the first element
      return pricingToProcess;
    } catch (e) {
      log.error("getSpRichardsItemPricingObj ", e.message);
    }
  }

  /**
   * This function call the creation and update of the item and item account plan custom record
   * @param {*} scriptId
   * @param {*} deploymentId
   * @param {*} params
   */

  /**
   * This function maps the column line for essendant and iterate each line and return the line object
   * @param {*}fileObj - file Object
   * @param {*}accountNumber
   */
  function getEssendantItemPricingObj(fileObj, accountNumber) {
    try {
      const pricingToProcess = [];
      const iterator = fileObj.lines.iterator();
      iterator.each(function (line) {
        const initialLineValue = line.value.replace(/"/g, "");
        const lineValues = initialLineValue.split(",");
        const itemId = lineValues[0];
        const description = lineValues[6];
        const OUM = lineValues[8];
        const price = lineValues[10];
        const cost = lineValues[9];
        const contractCode = lineValues[18];
        pricingToProcess.push({
          accountNumber: accountNumber,
          itemId: itemId,
          description: description,
          OUM: OUM,
          price: price,
          cost: cost,
          contractCode: contractCode,
        });
        return true;
      });

      pricingToProcess.shift();
      //return object and remove the first element of the array
      return pricingToProcess;
    } catch (e) {
      log.error("getEssendantItemPricingObj", e.message);
    }
  }

  /**
   * This function check if the account number for trading partner is existing.
   * @param {int} tradingPartnerId
   * @param {string} accountNumber
   */
  function checkIfTPAccountNumberExists(tradingPartnerId, accountNumber) {
    try {
      let returnedAccountNumber = 0;
      const tpAccountNumberSearch = search.create({
        type: "customrecord_bsp_isg_account_number",
        filters: [
          [
            "custrecord_bsp_isg_parent_trading_partn",
            "anyof",
            tradingPartnerId,
          ],
          "AND",
          ["name", "is", accountNumber],
        ],
        columns: [],
      });
   
      if (tpAccountNumberSearch.runPaged().count === 0) return;
      tpAccountNumberSearch.run().each(function (result) {
        returnedAccountNumber = result.id;
        return true;
      });
      return returnedAccountNumber;
    } catch (e) {
      log.error(checkIfTPAccountNumberExists, e.message);
    }
  }

  /**
   * This function delete all of the contact plan under the specified account number and vendor
   * @param {*} accountNUmber
   * @param {*} tradingPartnerId
   */
  function searchItemAccountNumberPlan(accountNUmber, tradingPartnerId) {
    try {
      const itemAccountPriceListToDelete = [];
      const itemContractPlanSearch = search.create({
        type: "customrecord_bsp_isg_item_acct_data",
        filters: [
          ["custrecord_bsp_isg_account_number", "anyof", accountNUmber],
          "AND",
          ["custrecord_bsp_isg_item_supplier", "anyof", tradingPartnerId],
        ],
      });
      itemContractPlanSearch.run().each(function (result) {
        itemAccountPriceListToDelete.push(result.id);
        return true;
      });
      return itemAccountPriceListToDelete;
    } catch (e) {
      log.error("searchItemAccountNumberPlan", e.message);
    }
  }

  function checkItemId(itemId) {
    try {
      let itemIdResults;
      const itemSearchObj = search.create({
        type: "item",
        filters: [["name", "is", itemId]],
        columns: [
          search.createColumn({ name: "internalid", label: "Internal ID" }),
        ],
      });
      itemSearchObj.run().each(function (result) {
        itemIdResults = result.id;
        return true;
      });
      return itemIdResults;
    } catch (e) {
      log.error(" checkItemId ", e.message);
    }
  }

  /**
   * This function check the update/create of the item and item account contract plan is still running
   * @param {*} scriptDeploymentID
   */
  function InstanceChecker(scriptDeploymentID) {
    var scheduledscriptinstanceSearchObj = search.create({
      type: "scheduledscriptinstance",
      filters: [
        ["scriptdeployment.scriptid", "is", scriptDeploymentID],
        "AND",
        ["status", "anyof", "PROCESSING"],
      ],
    });

    return scheduledscriptinstanceSearchObj.runPaged().count;
  }

  /**
   * This function create BSP | ISG | Item Contract/Plans
   * @param {*} itemPricingData - item pricing data
   * @param {*} vendor
   */
  function createItemAccountPlans(itemId, itemPricingData, vendor) {
    try {
      const itemAccountPLansRec = record.create({
        type: "customrecord_bsp_isg_item_acct_data",
      });
      itemPricingData.accountNumber &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_account_number",
          value: +itemPricingData.accountNumber,
        });
      itemPricingData.itemId &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_parent_item",
          value: itemId,
        });
      vendor &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_item_supplier",
          value: vendor,
        });
      itemPricingData.contractCode &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_item_contract_code",
          value: itemPricingData.contractCode,
        });
      itemPricingData.price &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_item_price",
          value: itemPricingData.price,
        });
      itemPricingData.cost &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_item_cost",
          value: itemPricingData.cost,
        });
      itemPricingData.OUM &&
        itemAccountPLansRec.setValue({
          fieldId: "custrecord_bsp_isg_contract_code_uom",
          value: itemPricingData.OUM,
        });
      return itemAccountPLansRec.save({
        ignoreMandatoryFields: true,
      });
      
    } catch (e) {
      log.error(createItemAccountPlans, e.message);
    }
  }

  /**
   * Move the processed CSV file to done folder
   * @param {*} fileId
   * @param {*} folderId
   */
  function moveFolderToDone(fileId, folderId) {
    const fileObj = file.load({
      id: fileId,
    });
    if (fileObj) {
      fileObj.folder = folderId;
      const moved = fileObj.save();
      log.debug(
        `File with internal ID: ${moved}  moved to folder ${folderId}.`
      );
    } else log.debug(`File with internal ID:  ${fileId} not found.`);
  }

  /**
   * This update the item and item contract plan
   * @param {*} itemId
   * @param {*} itemPricingData
   * @param {*} vendor
   */
  function updateItem(itemId, itemPricingData, vendor) {
    try {
      const itemRec = record.load({
        type: record.Type.INVENTORY_ITEM,
        id: itemId,
        isDynamic: true,
      });
      itemPricingData.cost &&
        itemRec.setValue({
          fieldId: "cost",
          value: itemPricingData.cost,
        });

      itemPricingData.description &&
        itemRec.setValue({
          fieldId: "displayname",
          value: itemPricingData.description,
        });

      return itemRec.save({
        ignoreMandatoryFields: true,
      });
   
    } catch (e) {
      log.error(" updateItem ", e.message);
    }
  }

  /**
   * This function create item record if the item is not existing
   * @param {*} itemPricingData
   * @param {*} vendor
   */
  function createItem(itemPricingData, vendor) {
    try {
      const itemRec = record.create({
        type: "inventoryitem",
        isDynamic: true,
      });
      itemPricingData.cost &&
        itemRec.setValue({
          fieldId: "cost",
          value: itemPricingData.cost,
        });

      itemPricingData.description &&
        itemRec.setValue({
          fieldId: "displayname",
          value: itemPricingData.description,
        });

      itemRec.setValue({
        fieldId: "itemid",
        value: itemPricingData.itemId,
      });

      itemRec.setValue({
        fieldId: "isonline",
        value: false,
      });

      const itemRecId = itemRec.save({ ignoreMandatoryFields: true });
      return itemRecId
      log.debug("createItem", `Item ${itemRecId} created successfully`);
    } catch (e) {
      log.error("createItem", e.message);
    }
  }

  /**
   * This function get the file Id of the CSV file in the Pending Folder
   * @param {*} folderId
   */
  function getFileId(folderId) {
    try {
      let fileId;
      const fileSearch = search.create({
        type: search.Type.FOLDER,
        columns: [
          {
            join: "file",
            name: "internalid",
          },
        ],
        filters: [
          {
            name: "internalid",
            operator: "anyof",
            values: folderId,
          },
        ],
      });

      fileSearch.run().each(function (result) {
        fileId = result.getValue({
          join: "file",
          name: "internalid",
        });

        return false;
      });
      return fileId;
    } catch (e) {
      log.error("getFileId ", e.message);
    }
  }

  return {
    getEssendantItemPricingObj: getEssendantItemPricingObj,
    getSpRichardsItemPricingObj: getSpRichardsItemPricingObj,
    checkItemId: checkItemId,
    updateItem: updateItem,
    createItemAccountPlans: createItemAccountPlans,
    createItem: createItem,
    checkIfTPAccountNumberExists: checkIfTPAccountNumberExists,
    moveFolderToDone: moveFolderToDone,
    searchItemAccountNumberPlan: searchItemAccountNumberPlan,
    getFileId: getFileId,
    InstanceChecker: InstanceChecker,
  };
});
