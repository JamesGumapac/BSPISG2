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

  /**
   * get the column provided from the feed
   * @returns {string[]}
   */
  function getColumns() {
    return [
      "id",
      "title",
      "description",
      "image_link",
      "link",
      "price",
      "quantity",
      "product_type",
      "brand",
      "google_product_category",
      "condition",
      "availability",
      "mpn",
      "color",
      "size",
      "gtin",
      "shipping_height",
      "shipping_length",
      "shipping_width",
      "shipping_weight",
      "product_weight",
      "shipping",
      "identifier_exists",
    ];
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
        const basedPrice = itemData.price.substring(
          0,
          itemData.price.lastIndexOf(" ")
        );
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
      if (itemData.product_weight) {
        const weight = itemData.product_weight.substring(
          0,
          itemData.product_weight.lastIndexOf(" ")
        );
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

      itemData.brand &&
        itemRec.setValue({
          fieldId: "manufacturer",
          value: itemData.brand,
        });

      itemRec.setValue({
        fieldId: "itemid",
        value: itemData.id,
      });

      itemRec.setValue({
        fieldId: "isonline",
        value: false,
      });

      return itemRec.save({ ignoreMandatoryFields: true });
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
    getLbSettingsForUploadItem: getLbSettingsForUploadItem,
    ifItemExists: ifItemExists,
  };
});
