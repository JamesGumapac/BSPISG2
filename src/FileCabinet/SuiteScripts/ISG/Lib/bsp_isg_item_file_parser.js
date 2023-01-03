8;
/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/record", "N/search", "N/runtime"], /**
 * @param{file} file
 * @param record
 * @param search
 * @param runtime
 */ (file, record, search, runtime) => {
  function getItemObj(itemlist) {
    try {
      return createItemObj(getColumns(), JSON.parse(itemlist));
    } catch (e) {
      log.error("getItemObj", e.message);
    }
  }

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
   * This function combine they a set of array keys and objects into one set of objects
   * @param {*} key
   * @param {*} value
   */
  function createItemObj(key, value) {
    try {
    } catch (e) {
      log.error("functionName: createItemObj", e.message);
    }
    return key.reduce((acc, val, ind) => {
      acc[val] = value[ind];
      return acc;
    }, {});
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

  //
  // /**
  //  * get the column provided from the feed
  //  * @returns {string[]}
  //  */
  // function getColumns() {
  //   return [
  //     "id",
  //     "title",
  //     "description",
  //     "image_link",
  //     "link",
  //     "price",
  //     "quantity",
  //     "product_type",
  //     "brand",
  //     "google_product_category",
  //     "condition",
  //     "availability",
  //     "mpn",
  //     "color",
  //     "size",
  //     "gtin",
  //     "shipping_height",
  //     "shipping_length",
  //     "shipping_width",
  //     "shipping_weight",
  //     "product_weight",
  //     "shipping",
  //     "identifier_exists",
  //   ];
  // }

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
  }

  /**
   * Create vendor sublist
   * @param itemId
   * @param vendorAssociations
   * @returns {number|*}
   */
  function createVendorSublist(itemId, vendorAssociations) {
    log.debug("createVendorSublist", vendorAssociations);
    try {
      const itemRec = record.load({
        type: record.Type.INVENTORY_ITEM,
        id: itemId,
        isDynamic: true,
      });

      let vendorId = checkIfVendorExists(vendorAssociations[0].vendor_name);
      if (vendorId === false) {
        vendorId = createVendor(vendorAssociations[0].vendor_name);
      }
      log.debug("createVendorSublist", vendorId);
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
    let vendorId;
    const vendorSearch = search.create({
      type: "vendor",
      filters: [["entityid", "is", vendorName]],
    });
    vendorSearch.run().each(function (result) {
      vendorId = result.id;
    });
    return vendorId ? vendorId : false;
  }

  /**
   * create initial unit of measurement
   * @param abbreviation
   * @returns {number|*}
   */
  function createUnitOfMeasure(abbreviation) {
    try {
      const rec = record.create({
        type: "unitstype",
        isDynamic: true,
      });
      rec.selectNewLine("uom");
      switch (abbreviation) {
        case "EA":
          rec.setValue({
            fieldId: "name",
            value: "Each"
          })
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
            value: "EA",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "pluralname",
            value: "EACH",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "baseunit",
            value: true,
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "unitname",
            value: "EACH",
          });
          break;
        case "PK":
          rec.setValue({
            fieldId: "name",
            value: "Package"
          })
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
            value: "PKs",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "pluralname",
            value: "Packages",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "baseunit",
            value: true,
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "unitname",
            value: "EACH",
          });
          break;
        case "BX":
          rec.setValue({
            fieldId: "name",
            value: "Box"
          })
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
            value: "BXs",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "pluralname",
            value: "Boxes",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "baseunit",
            value: true,
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "unitname",
            value: "Box",
          });
          break;
        case "KG":
          rec.setValue({
            fieldId: "name",
            value: "Kilogram"
          })
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
            value: "KGs",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "pluralname",
            value: "Kilograms",
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "baseunit",
            value: true,
          });
          rec.setCurrentSublistValue({
            sublistId: "uom",
            fieldId: "unitname",
            value: "Kilogram",
          });
          break;
      }
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
      let unitOfMeasureId;
      const unitstypeSearchObj = search.create({
        type: "unitstype",
        filters: [["abbreviation", "is", abbreviation]],
      });
      const searchResultCount = unitstypeSearchObj.runPaged().count;
      if (searchResultCount > 0) {
        unitstypeSearchObj.run().each(function (result) {
          unitOfMeasureId = result.id;
        });
      } else {
        unitOfMeasureId = createUnitOfMeasure(abbreviation);
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
    log.debug("itemData", itemData);
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

      itemData.uom &&
        itemRec.setValue({
          fieldId: "unitstype",
          value: getUnitOfmeasureId(itemData.uom),
        });

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
    } catch (e) {
      log.error(
        "functionName: createItem",
        e.message + " for Item ID:" + itemData.id
      );
    }
  }

  return {
    getItemObj: getItemObj,
    createItem: createItem,
    createVendor:createVendor,
    checkIfVendorExists: checkIfVendorExists,
    getLbSettingsForUploadItem: getLbSettingsForUploadItem,
    ifItemExists: ifItemExists,
    createVendorSublist: createVendorSublist
  };
});
