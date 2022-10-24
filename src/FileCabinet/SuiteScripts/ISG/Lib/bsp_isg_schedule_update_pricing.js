/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/search", "N/record"], function (file, search, record) {
  /**
   * This function maps the column line for SPR and iterate each line and return the line object
   * @param {*} fileObj - file Object
   */
  function getSpRichardsItemPricingObj(fileObj) {
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
   * This function maps the column line for essendant and iterate each line and return the line object
   * @param {*} fileObj - file Object
   */
  function getEssendantItemPricingObj(fileObj) {
    try {
      const pricingToProcess = [];
      const iterator = fileObj.lines.iterator();
      iterator.each(function (line) {
        const initialLineValue = line.value.replace(/"/g, "");
        const lineValues = initialLineValue.split(",");
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
      pricingToProcess.shift();

      //return object and remove the first element of the array
      return pricingToProcess;
    } catch (e) {
      log.error("getEssendantItemPricingObj", e.message);
    }
  }

  /**
   * This function check if the item ID exist
   * @param {*} itemId
   */
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
        "File with internal ID: " + moved + " moved to folder " + folderId + "."
      );
    } else log.debug("File with internal ID: " + fileId + " not found.");
  }

  /**
   * This update the item and item contract plan
   * @param {*} itemId
   * @param {*} itemPricingData
   * @param {*} vendor
   */
  function updateItemAndContractPlan(itemId,itemPricingData, vendor) {
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

      const vendorLine = itemRec.findSublistLineWithValue({
        sublistId: "itemvendor",
        fieldId: "vendor",
        value: vendor,
      });

      const vendorCodeLine = itemRec.findSublistLineWithValue({
        sublistId: "itemvendor",
        fieldId: "vendorcode",
        value: itemPricingData.contractCode
      })
      if (
        vendorLine !== -1 &&
        vendorCodeLine !== -1 &&
        vendorLine === vendorCodeLine
      ) {
        itemRec.selectLine({
          sublistId: "itemvendor",
          line: vendorLine,
        });
        itemRec.setCurrentSublistValue({
          sublistId: "itemvendor",
          fieldId: "purchaseprice",
          value: itemPricingData.cost,
        });
        itemRec.commitLine({
          sublistId: "itemvendor",
        });
      } else {
        //if vendor line is not found create line for vendor and contractCode
        itemRec.selectLine({
          sublistId: "itemvendor",
          line: vendorLine,
        });
        itemRec.setCurrentSublistValue({
          sublistId: "itemvendor",
          fieldId: "vendor",
          value: vendor,
        });
        itemRec.setCurrentSublistValue({
          sublistId: "itemvendor",
          fieldId: "vendorcode",
          value: itemPricingData.contractCode,
        });
        itemRec.setCurrentSublistValue({
          sublistId: "itemvendor",
          fieldId: "purchaseprice",
          value: itemPricingData.cost,
        });
        itemRec.commitLine({
          sublistId: "itemvendor",
        });
      }
      const itemRecId = itemRec.save({
        ignoreMandatoryFields: true,
      });
      log.debug(
        " updateItemAndContractPlan ",
        `Item ${itemRecId} updated successfully`
      );
      if (itemPricingData.contractCode) {
        const itemContractPlan = updateItemContractPlanPrice(
          itemRecId,
          itemPricingData.contractCode,
          itemPricingData.price,
          itemPricingData.cost
        );
        log.debug("item and contract plan", { itemRecId, itemContractPlan });
      }
    } catch (e) {
      log.error("updateItemAndContractPlan ", e.message);
    }
  }

  /**
   * This function update item contract plan
   * @param {*} itemId
   * @param {*} contractCode
   * @param {*} purchasePrice
   * @param {*} cost
   */
  function updateItemContractPlanPrice(
    itemId,
    contractCode,
    purchasePrice,
    cost
  ) {
    try {
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
      if (searchResultCount <= 0) return false;
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
    } catch (e) {
      log.error("updateItemContractPlanPrice ", e.message);
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
        fieldId: "purchaseprice",
        value: itemPricingData.cost,
      });
      itemRec.commitLine({
        sublistId: "itemvendor",
      });

      const itemRecId = itemRec.save({ ignoreErrors: true });
      log.debug(
        " updateItemAndContractPlan ",
        `Item ${itemRecId} updated successfully`
      );
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
    updateItemAndContractPlan: updateItemAndContractPlan,
    createItem: createItem,
    moveFolderToDone: moveFolderToDone,
    getFileId: getFileId,
  };
});
