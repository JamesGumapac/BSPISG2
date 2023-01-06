/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/record", "N/search", "N/runtime"], /**
 * @param{file} file
 * @param record
 * @param search
 * @param runtime
 */ (file, record, search, runtime) => {
  /**
   * get the URL, default Asset Account and default COGS account
   * @returns {{}}
   */
  function getLbSettingsForUploadItem() {
    try {
      let lbSettings = {};
      const customrecord_bsp_isg_lb_integ_settingsSearchObj = search.create({
        type: "customrecord_bsp_isg_lb_integ_settings",
        columns: [
          search.createColumn({
            name: "custrecord_bsp_isg_lb_default_asset_acc",
            label: "Default Asset Account",
          }),
          search.createColumn({
            name: "custrecord_bsp_isg_lb_default_cogs_acc",
            label: "Default COGS Account",
          }),
          search.createColumn({
            name: "custrecord_bsp_isg_lb_item_upload_url",
            label: "URL",
          }),
        ],
      });
      customrecord_bsp_isg_lb_integ_settingsSearchObj
        .run()
        .each(function (result) {
          const url = result.getValue({
            name: "custrecord_bsp_isg_lb_item_upload_url",
          });
          const defaultAssetAccount = result.getValue({
            name: "custrecord_bsp_isg_lb_default_asset_acc",
          });
          const defaultCogsAccount = result.getValue({
            name: "custrecord_bsp_isg_lb_default_cogs_acc",
          });
          lbSettings = {
            url: url,
            defaultAssetAccount: defaultAssetAccount,
            defaultCogsAccount: defaultCogsAccount,
          };
        });
      return lbSettings;
    } catch (e) {
      log.error("functionName: getLbSettingsForUploadItem", e.message);
    }
  }

  /**
   * Check Item if exists
   * @param itemId
   * @returns {*}
   */
  function ifItemExists(itemId) {
    try {
      let itemIdResults;
      const itemSearchObj = search.create({
        type: "item",
        filters: [["name", "is", itemId]],
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
   * check if the multiCurrency feature is enabled
   * @returns {boolean}
   */
  function checkIfMultiCurrencyEnabled() {
    return runtime.isFeatureInEffect({
      feature: "MULTICURRENCY",
    });
  }

  /**
   * Create new vendor
   * @param vendorName
   * @returns {number|*}
   */
  function createVendor(vendorName) {
    try {
      const vendorRec = record.create({
        type: record.Type.VENDOR,
        isDynamic: true,
      });
      vendorRec.setValue({
        fieldId: "companyname",
        value: vendorName,
      });
      return vendorRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createVendor", e.message);
    }
  }

  /**
   * Check if vendor is existing already in the item vendor line
   * @param itemId
   * @param vendorId
   * @returns {number|*}
   */
  function checkItemVendorSublist(itemId, vendorId) {
    try {
      const itemRec = record.load({
        type: record.Type.INVENTORY_ITEM,
        id: itemId,
        isDynamic: true,
      });

      return itemRec.findSublistLineWithValue({
        sublistId: "itemvendor",
        fieldId: "vendor",
        value: vendorId,
      });
    } catch (e) {
      log.error("checkItemVendorSublist", e.message);
    }
  }

  /**
   * Create vendor sublist
   * @param itemId
   * @param vendorAssociations
   * @returns {number|*}
   */
  function createVendorSublist(itemId, vendorAssociations) {
    try {
      const itemRec = record.load({
        type: record.Type.INVENTORY_ITEM,
        id: itemId,
        isDynamic: true,
      });

      let vendorId = checkIfVendorExists(vendorAssociations[0].vendor_name);
      if (!vendorId) {
        vendorId = createVendor(vendorAssociations[0].vendor_name);
      }
      itemRec.selectNewLine("itemvendor");
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "vendor",
        value: vendorId,
      });
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "purchaseprice",
        value: vendorAssociations[0].cost,
      });
      itemRec.setCurrentSublistValue({
        sublistId: "itemvendor",
        fieldId: "vendorcode",
        value: vendorAssociations[0].uom,
      });
      itemRec.commitLine("itemvendor");
      return itemRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("createVendorSublist", e.message);
    }
  }

  /**
   * Check if vendor Exists
   * @param vendorName
   * @returns {*|boolean}
   */
  function checkIfVendorExists(vendorName) {
    try {
      let vendorId;
      const vendorSearch = search.create({
        type: "vendor",
        filters: [["entityid", "is", vendorName]],
      });
      vendorSearch.run().each(function (result) {
        vendorId = result.id;
      });
      return vendorId;
    } catch (e) {
      log.error("checkIfVendorExists", e.message);
    }
  }

  /**
   * Update Logiblock UOM
   * @param abbreviation
   * @param uomId
   * @returns {number|*}
   */
  function addUnitOfMeasure(abbreviation, uomId) {
    try {
      const rec = record.load({
        type: "unitstype",
        id: uomId,
        isDynamic: true,
      });
      const isUOMexists = rec.findSublistLineWithValue({
        sublistId: "uom",
        fieldId: "abbreviation",
        value: abbreviation,
      });

      if (isUOMexists !== -1) {
        return rec.getSublistValue({
          sublistId: "uom",
          fieldId: "internalid",
          line: isUOMexists,
        });
      } else {
        try {
          rec.selectNewLine({ sublistId: "uom" });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "abbreviation",
            value: abbreviation,
          });

          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "conversionrate",
            value: 1,
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "pluralabbreviation",
            value: abbreviation,
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "pluralname",
            value: abbreviation,
          });

          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "unitname",
            value: abbreviation,
          });
          rec.commitLine("uom");
          const UOMnewId = rec.save({
            ignoreMandatoryFields: true,
          });

          if (UOMnewId) {
            const saveRec = record.load({
              type: "unitstype",
              id: UOMnewId,
              isDynamic: true,
            });

            let UOMLine = saveRec.findSublistLineWithValue({
              sublistId: "uom",
              fieldId: "abbreviation",
              value: abbreviation,
            });

            return saveRec.getSublistValue({
              sublistId: "uom",
              fieldId: "internalid",
              line: UOMLine,
            });
          }
        } catch (e) {
          log.error("erroring in creating new uom", e.message);
        }
      }
    } catch (e) {
      log.error("addUnitOfMeasure", e.message);
    }
  }

  /**
   * Update the unit of measurement of the item
   * @param itemId
   * @param abbrevation
   * @returns {number|*}
   */
  function updateUnitOfMeasure(itemId, abbrevation) {
    try {
      const primaryUOMId = getUnitOfmeasureId(abbrevation);
      const itemRec = record.load({
        type: record.Type.INVENTORY_ITEM,
        id: itemId,
        isDynamic: true,
      });
      const primaryUnitTypeId = itemRec.getValue("unitstype");
  
      if (!isEmpty(primaryUOMId) || primaryUnitTypeId === "") {
        itemRec.setValue({
          fieldId: "unitstype",
          value: primaryUOMId,
        });
      }
      if (primaryUOMId) {
        let UOMPrimaryBasedUnit = addUnitOfMeasure(abbrevation, primaryUOMId);
        if (UOMPrimaryBasedUnit) {
          itemRec.setValue({
            fieldId: "stockunit",
            value: UOMPrimaryBasedUnit,
          });
          itemRec.setValue({
            fieldId: "purchaseunit",
            value: UOMPrimaryBasedUnit,
          });
          itemRec.setValue({
            fieldId: "saleunit",
            value: UOMPrimaryBasedUnit,
          });
        }
      }
      return itemRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("updateUnitOfMeasure", e.message);
    }
  }
  
  /**
   * check if the string is empty
   * @param stValue
   * @returns {boolean}
   */
  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length === 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  /**
   * create initial unit of measurement
   * @param name
   * @returns {number|*}
   */
  function createUnitOfMeasure(name) {
    try {
      const rec = record.create({
        type: "unitstype",
        isDynamic: true,
      });

      rec.setValue({
        fieldId: "name",
        value: name,
      });

      rec.selectNewLine({ sublistId: "uom" });
      rec.setCurrentSublistValue({
        sublistId: "uom",
        fieldId: "abbreviation",
        value: "EA",
      });

      rec.setCurrentSublistValue({
        sublistId: "uom",
        fieldId: "conversionrate",
        value: 1,
      });
      rec.setCurrentSublistValue({
        sublistId: "uom",
        fieldId: "baseunit",
        value: true,
      });
      rec.setCurrentSublistValue({
        sublistId: "uom",
        fieldId: "pluralabbreviation",
        value: "EA",
      });
      rec.setCurrentSublistValue({
        sublistId: "uom",
        fieldId: "pluralname",
        value: "Each",
      });

      rec.setCurrentSublistValue({
        sublistId: "uom",
        fieldId: "unitname",
        value: "Each",
      });
      rec.commitLine("uom");
      return rec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("createUnitOfMeasure", e.message);
    }
  }

  /**
   * Create and return the internal Id of unit of measure in Netsuite
   * @param abbreviation
   */
  function getUnitOfmeasureId(abbreviation) {
    try {
      const logicblockUOM = "Logicblock";
      let unitOfMeasureId;
      const unitstypeSearchObj = search.create({
        type: "unitstype",
        filters: [["name", "is", logicblockUOM]],
      });
      const searchResultCount = unitstypeSearchObj.runPaged().count;

      if (searchResultCount) {
        unitstypeSearchObj.run().each(function (result) {
          unitOfMeasureId = result.id;
        });
      } else {
        unitOfMeasureId = createUnitOfMeasure(logicblockUOM);
      }
      return unitOfMeasureId;
    } catch (e) {
      log.error("getUnitOfmeasureId", e.message);
    }
  }

  /**
   * Create Item Record
   * @param itemData
   * @returns {number|*}
   */
  function createItem(itemData) {
    try {
      const lbSettings = getLbSettingsForUploadItem();
      const itemRec = record.create({
        type: "inventoryitem",
        isDynamic: true,
      });

      if (itemData.price) {
        const basedPrice = itemData.price.toFixed(2);
        const isMultiCurrencyEnabled = checkIfMultiCurrencyEnabled();
        let priceSublistId;
        if (isMultiCurrencyEnabled === true) {
          priceSublistId = "price1";
        } else {
          priceSublistId = "price";
        }

        itemRec.selectLine({
          sublistId: priceSublistId,
          line: 0,
        });
        itemRec.setCurrentSublistValue({
          sublistId: priceSublistId,
          fieldId: "price_1_",
          value: +basedPrice,
        });
        itemRec.commitLine({
          sublistId: priceSublistId,
        });
      }
      if (itemData.shipping_weight) {
        const weight = itemData.shipping_weight.toFixed(2);
        itemRec.setValue({
          fieldId: "weight",
          value: +weight,
        });
      }

      lbSettings.defaultAssetAccount &&
        itemRec.setValue({
          fieldId: "assetaccount",
          value: lbSettings.defaultAssetAccount,
        });

      lbSettings.defaultCogsAccount &&
        itemRec.setValue({
          fieldId: "cogsaccount",
          value: lbSettings.defaultCogsAccount,
        });

      itemData.mpn &&
        itemRec.setValue({
          fieldId: "mpn",
          value: itemData.mpn,
        });
      itemData.description &&
        itemRec.setValue({
          fieldId: "salesdescription",
          value: itemData.description,
        });
      itemData.gtin &&
        itemRec.setValue({
          fieldId: "upccode",
          value: itemData.gtin,
        });

      itemData.title &&
        itemRec.setValue({
          fieldId: "displayname",
          value: itemData.title,
        });

      if (itemData.uom) {
        let oumId = getUnitOfmeasureId(itemData.uom);

        if (oumId) {
          itemData.uom &&
            itemRec.setValue({
              fieldId: "unitstype",
              value: oumId,
            });
          let UOMPrimaryBasedUnit = addUnitOfMeasure(itemData.uom, oumId);
          if (UOMPrimaryBasedUnit) {
            itemRec.setValue({
              fieldId: "stockunit",
              value: UOMPrimaryBasedUnit,
            });
            itemRec.setValue({
              fieldId: "purchaseunit",
              value: UOMPrimaryBasedUnit,
            });
            itemRec.setValue({
              fieldId: "saleunit",
              value: UOMPrimaryBasedUnit,
            });
          }
        }
      }
      itemData.manufacturer_name &&
        itemRec.setValue({
          fieldId: "manufacturer",
          value: itemData.manufacturer_name,
        });

      itemRec.setValue({
        fieldId: "itemid",
        value: itemData.sku,
      });

      itemRec.setValue({
        fieldId: "isonline",
        value: false,
      });

      let itemId = itemRec.save({ ignoreMandatoryFields: true });
      if (itemData.vendor_associations.length > 0) {
        if (itemData.uom === itemData.vendor_associations[0].uom) {
          createVendorSublist(itemId, itemData.vendor_associations);
        }
      }
      return itemId
    } catch (e) {
      log.error("createItem", e.message + " for Item ID:" + itemData.id);
    }
  }

  return {
    createItem: createItem,
    createVendor: createVendor,
    checkIfVendorExists: checkIfVendorExists,
    getLbSettingsForUploadItem: getLbSettingsForUploadItem,
    checkItemVendorSublist: checkItemVendorSublist,
    ifItemExists: ifItemExists,
    createVendorSublist: createVendorSublist,
    updateUnitOfMeasure: updateUnitOfMeasure,
  };
});
