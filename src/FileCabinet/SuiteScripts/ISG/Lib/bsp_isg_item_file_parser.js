/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/record", "N/search"], /**
 * @param{file} file
 * @param record
 * @param search
 */ (file, record, search) => {
  function getItemObj(itemlist) {
    try {
      return createItemObj(getColumns(), JSON.parse(itemlist));
    } catch (e) {
      log.error("getItemObj", e.message);
    }
  }

  /**
   * This function combine they a set of array keys and objects into one set of objects
   * @param {*} key
   * @param {*} value
   */
  function createItemObj(key, value) {
    return key.reduce((acc, val, ind) => {
      acc[val] = value[ind];
      return acc;
    }, {});
  }

  /**
   * get the integration settings URL
   * @param integrationSettingsId
   * @returns {*}
   */
  function getURL(integrationSettingsId) {
    const urlSearch = search.lookupFields({
      type: "customrecord_bsp_isg_lb_integ_settings",
      id: integrationSettingsId,
      columns: ["custrecord_bsp_isg_ge_item_upload_url"],
    });
    return urlSearch.custrecord_bsp_isg_ge_item_upload_url;
  }

  /**
   * get the column provided from the feed
   * @returns {string[]}
   */
  function getColumns() {
    const columns = [
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
    return columns;
  }

  /**
   * Create Item Record
   * @param itemData
   * @returns {number|*}
   */
  function createItem(itemData) {
    try {
      const itemRec = record.create({
        type: "inventoryitem",
        isDynamic: true,
      });

      if (itemData.price) {
        const basedPrice = itemData.price.substring(
          0,
          itemData.price.lastIndexOf(" ")
        );
        itemRec.selectLine({
          sublistId: "price ",
          line: 0,
        });
        itemRec.setCurrentSublistValue({
          sublistId: "price",
          fieldId: "price_1_",
          value: +basedPrice,
        });
        itemRec.commitLine({
          sublistId: "price1",
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
      log.error("createItem", e.message);
    }
  }

  return {
    getItemObj: getItemObj,
    createItem: createItem,
    getURL: getURL,
  };
});
