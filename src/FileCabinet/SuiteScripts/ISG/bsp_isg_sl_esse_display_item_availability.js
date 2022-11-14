/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
	"N/ui/serverWidget",
	"./Lib/bsp_isg_esse_item_availability.js"
], function (serverWidget, itemAvailabilityUtil) {
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
			let itemAvailabilityObj = [];
			let allAccountitemAvailabilityListObj = [];
			const tradingPartnerId = context.request.parameters["tradingParnerId"];
			const tpName = context.request.parameters["tpName"];
			
			let tpSettings = itemAvailabilityUtil.getTPSettings(tradingPartnerId);
			const itemId = context.request.parameters["itemId"];
			
			if (!itemAvailabilityUtil.isEmpty(tpSettings[0].tpAccountNumber)) {
				itemAvailabilityObj = itemAvailabilityUtil.getItemAvailabilityList(
					tpSettings,
					itemId,
					tpSettings[0].tpAccountNumber
				);
				allAccountitemAvailabilityListObj =
					itemAvailabilityObj[0].itemAvailabilityList;
			} else {
				//if account number from TP record is empty check all accounts for item availability
				const tpAccounts = itemAvailabilityUtil.getAllTpAccount(tradingPartnerId);
				let i = 0;
				tpAccounts.forEach((accountNumber) => {
					itemAvailabilityObj.push(
						itemAvailabilityUtil.getItemAvailabilityList(
							tpSettings,
							itemId,
							accountNumber.accountNumber
						)
					);
				
					//filter the item availability object array into one object
					itemAvailabilityObj[i][0].itemAvailabilityList.forEach(function (item) {
						let locationIndex = allAccountitemAvailabilityListObj.findIndex(
							(object) => {
								return object.locationId === item.locationId;
							}
						);
						if (locationIndex === -1) {
							allAccountitemAvailabilityListObj.push(item);
						} else {
							//check if the location has an existing availability from the next account if yes, set the quantity value
							allAccountitemAvailabilityListObj[locationIndex].quantity === 0 &&
							item.quantity !== 0
								? (allAccountitemAvailabilityListObj[locationIndex].quantity =
									item.quantity)
								: false;
						}
					});
					i++;
				});
			}
			log.debug("allAccountitemAvailabilityListObj", allAccountitemAvailabilityListObj)
			if (allAccountitemAvailabilityListObj.length > 0) {
				context.response.writePage(
					createForm(
						tpName,
						itemAvailabilityObj[0].itemName ||
						itemAvailabilityObj[0][0].itemName,
						allAccountitemAvailabilityListObj,
						tpSettings[0].isShowOutOfStock
					)
				);
			}
		} catch (e) {
			context.response.write(
				`<html><h3>No Such Item or invalid account number</h3></html>`
			);
			log.error(e.message);
		}
	}
	
	
	/**
	 * This function generates the form and sublist of the item availability
	 * @param tpName
	 * @param itemName
	 * @param itemAvailabilityList
	 * @param isShowOutOfStock
	 * @returns {Form}
	 */
	
	function createForm(tpName, itemName, itemAvailabilityList, isShowOutOfStock) {
		try {
			const essendantForm = serverWidget.createForm({
				title: `${tpName} Stock Availability`,
				hideNavBar: true,
			});
			essendantForm.addField({
				id: "custpage_itemname",
				label: "Item",
				type: serverWidget.FieldType.INLINEHTML,
			}).defaultValue = `<html><h1>Item Name: ${itemName}</h1></html>`;
			const sublist = essendantForm.addSublist({
				id: "sublistid",
				type: serverWidget.SublistType.STATICLIST,
				label: "Result",
			});
			
			sublist.addRefreshButton();
			
			sublist.addField({
				id: "custpage_location",
				label: "Location ID",
				type: serverWidget.FieldType.TEXT,
			});
			
			sublist.addField({
				id: "custpage_available",
				label: "Available Quantity",
				type: serverWidget.FieldType.INTEGER,
			});
			sublist.addField({
				id: "custpage_description",
				label: "Description",
				type: serverWidget.FieldType.TEXT,
			});
			sublist.addField({
				id: "custpage_etadate",
				label: "Estimated Restock Date",
				type: serverWidget.FieldType.TEXT,
			});
			//filter the item availability to only item that has stock or estimated stock date
			if (isShowOutOfStock === false || isShowOutOfStock === "F") {
				itemAvailabilityList = itemAvailabilityList.filter(
					(item) =>
						item.quantity > 0 ||
						(item.restockDate !== undefined &&
							item.restockDate !== "Unavailable")
				);
			}
			
			for (let i = 0; i < itemAvailabilityList.length; i++) {
				sublist.setSublistValue({
					id: "custpage_location",
					value: itemAvailabilityList[i].locationId,
					line: i,
				});
				
				sublist.setSublistValue({
					id: "custpage_available",
					value: itemAvailabilityList[i].quantity,
					line: i,
				});
				sublist.setSublistValue({
					id: "custpage_description",
					value: itemAvailabilityList[i].description
						? itemAvailabilityList[i].description
						: " ",
					line: i,
				});
				sublist.setSublistValue({
					id: "custpage_etadate",
					value: itemAvailabilityList[i].restockDate
						? itemAvailabilityList[i].restockDate
						: "Unavailable",
					line: i,
				});
			}
			sublist.label = ` Total: ${sublist.lineCount} `;
			return essendantForm;
		} catch (e) {
			log.error("createForm", e.message);
		}
	}
	
	
	return {
		onRequest: onRequest,
	};
});
