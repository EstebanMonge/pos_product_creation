odoo.define('pos_product_creation',function(require) {

var gui = require('point_of_sale.gui');
var chrome = require('point_of_sale.chrome');
var PopupWidget = require('point_of_sale.popups');
var popups = require('point_of_sale.popups');
var core = require('web.core');
var models = require('point_of_sale.models');
var rpc = require('web.rpc');
var QWeb = core.qweb;
var _t = core._t;
models.load_models({
        model:  'product.category',
        fields: ['name'],
        loaded: function(self,categories){
            self.categories = categories;
        },
        model:  'account.tax',
        fields: ['name','type_tax_use'],
        loaded: function(self,taxes){
            self.taxes = taxes;
        },
    });

chrome.OrderSelectorWidget.include({
    renderElement: function(){
        var self = this;
        this._super();
        var categ = [];
        var unit = [];
        var taxe = [];
        for (var i in self.pos.categories){
            categ.push(self.pos.categories[i].name);
        }
        for (var i in self.pos.units){
            unit.push(self.pos.units[i].name);
        }
        for (var i in self.pos.taxes){
            if ( self.pos.taxes[i].type_tax_use == 'sale') {
                taxe.push(self.pos.taxes[i].name);
	    }
        }
        this.$('.add-product').click(function(event){
            self.gui.show_popup('product_create',{
                'category': categ,
                'units':unit,
                'tax':taxe,
            });
        });
        this.$('.update-price').click(function(event){
            self.gui.show_popup('update_price');
        });
    },
});
var UpdatePriceWidget = PopupWidget.extend({
    template: 'UpdatePriceWidget',
    init: function(parent, args) {
        this._super(parent, args);
        this.options = {};
    },
    events: {
        'blur .barcode':  'blur_barcode',
        'click .button.cancel':  'click_cancel',
        'click .button.confirm': 'click_confirm',
    },
    show: function(options){
        options = options || {};
        this._super(options);
        this.renderElement();
        this.$('.barcode').focus();
    },
    blur_barcode: function(){
	var self = this;
        var barcode = this.$('.barcode').val();
	if (!barcode) {
            alert("Please fill Barcode");
	}
	else {
	    var product = self.pos.db.get_product_by_barcode(barcode);
	    if (!product) {
            alert("Product not found");
	    }
	    else {
            	$(document).find(".name").text(product.display_name);
            	$(document).find(".price").val(product.list_price);
           	$(document).find(".cost").val(product.standard_price);
	    }
	}
    },
    click_confirm: function(){
        var self = this;
        var barcode = this.$('.barcode').val();
        var price = this.$('.price').val();
        var cost = this.$('.cost').val();
        if(!barcode || !price) {
            alert("Please fill Barcode & Price for the Product!")
        }
        else {
             var product_vals = {
                'barcode': barcode,
                'price': price,
                'cost': cost,
            };
            rpc.query({
                    model: 'product.product',
                    method: 'update_product_pos',
                    args: [product_vals],
                });
            this.gui.close_popup();
        }
    },
    click_cancel: function(){
        this.gui.close_popup();
        if (this.options.cancel) {
            this.options.cancel.call(this);
        }
    },
});
var ProductCreationWidget = PopupWidget.extend({
    template: 'ProductCreationWidget',
    init: function(parent, args) {
        this._super(parent, args);
        this.options = {};
        this.category = [];
        this.units = [];
        this.tax = [];
    },
    events: {
        'click .button.cancel':  'click_cancel',
        'click .button.confirm': 'click_confirm',
    },
    show: function(options){
        options = options || {};
        this._super(options);
        this.category = options.category;
        this.units = options.units;
        this.tax = options.tax;
        this.renderElement();
        this.$('.barcode').focus();
    },
    click_confirm: function(){
        var self = this;
        var name = this.$('.name').val();
        var barcode = this.$('.barcode').val();
        var type = this.$('.type').val();
        var category = this.$('.category').val();
        var unit = this.$('.uom').val();
        var price = this.$('.price').val();
        var cost = this.$('.cost').val();
        var tax = this.$('.tax').val();
        if(!name || !price) {
            alert("Please fill Name & Price for the Product!")
        }
        else {
             var product_vals = {
                'name': name,
                'barcode': barcode,
                'type': type,
                'category': category,
                'price': price,
                'cost': cost,
                'unit': unit,
                'tax': tax
            };
            rpc.query({
                    model: 'product.product',
                    method: 'create_product_pos',
                    args: [product_vals],
                }).then(function (products){
                    self.pos.db.add_products(_.map([products], function (product) {
                        product.categ = _.findWhere(self.pos.product_categories, {'id': product.categ_id[0]});
                        return new models.Product({}, product);
                    }));
                });
            this.gui.close_popup();
        }
    },
    click_cancel: function(){
        this.gui.close_popup();
        if (this.options.cancel) {
            this.options.cancel.call(this);
        }
    },
});
gui.define_popup({name:'product_create', widget: ProductCreationWidget});
gui.define_popup({name:'update_price', widget: UpdatePriceWidget});
});
