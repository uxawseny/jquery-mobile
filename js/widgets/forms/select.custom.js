/*!
 * jQuery Mobile Custom Select @VERSION
 * http://jquerymobile.com
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */

//>>label: Selects: Custom menus
//>>group: Forms
//>>description: Extension to select menus to support menu styling, placeholder options, and multi-select features.
//>>docs: http://api.jquerymobile.com/selectmenu/
//>>demos: http://demos.jquerymobile.com/@VERSION/selectmenu-custom/
//>>css.structure: ../css/structure/jquery.mobile.forms.select.css
//>>css.theme: ../css/themes/default/jquery.mobile.theme.css

( function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [
			"jquery",
			"../../core",
			"../../navigation",
			"./select",
			"../listview",
			"../page.dialog.backcompat",
			"../popup" ], factory );
	} else {

		// Browser globals
		factory( jQuery );
	}
} )( function( $ ) {

var unfocusableItemSelector = ".ui-disabled,.ui-state-disabled,.ui-listview-item-divider,.ui-screen-hidden,:jqmData(role='placeholder')",
	goToAdjacentItem = function( item, target, direction ) {
		var adjacent = item[ direction + "All" ]()
			.not( unfocusableItemSelector )
				.first();

		// If there's a previous option, focus it
		if ( adjacent.length ) {
			target
				.blur()
				.attr( "tabindex", "-1" );

			adjacent.find( "a" ).first().focus();
		}
	};

return $.widget( "mobile.selectmenu", $.mobile.selectmenu, {
	_create: function() {
		var o = this.options;

		this._origTabIndex = ( this.element.attr( "tabindex" ) === undefined ) ? false : this.element.attr( "tabindex" );

		// Custom selects cannot exist inside popups, so revert the "nativeMenu" option to true if
		// a parent is a popup
		o.nativeMenu = o.nativeMenu || ( this.element.parents( ":jqmData(role='popup'),:mobile-popup" ).length > 0 );

		return this._super();
	},

	_handleSelectFocus: function() {
		this.element.blur();
		this.button.focus();
	},

	_handleKeydown: function( event ) {
		this._super( event );
		this._handleButtonVclickKeydown( event );
	},

	_handleButtonVclickKeydown: function( event ) {
		if ( this.options.disabled || this.isOpen || this.options.nativeMenu ) {
			return;
		}

		if ( event.type === "vclick" ||
				event.keyCode && ( event.keyCode === $.mobile.keyCode.ENTER || event.keyCode === $.mobile.keyCode.SPACE ) ) {

			this._decideFormat();
			if ( this.menuType === "overlay" ) {
				this.button.attr( "href", "#" + this.popupId ).attr( "data-" + ( $.mobile.ns || "" ) + "rel", "popup" );
			} else {
				this.button.attr( "href", "#" + this.dialogId ).attr( "data-" + ( $.mobile.ns || "" ) + "rel", "dialog" );
			}
			this.isOpen = true;
			// Do not prevent default, so the navigation may have a chance to actually open the chosen format
		}
	},

	_handleListFocus: function( e ) {
		var params = ( e.type === "focusin" ) ?
			{ tabindex: "0", event: "vmouseover" } :
			{ tabindex: "-1", event: "vmouseout" };

		$( e.target )
			.attr( "tabindex", params.tabindex )
			.trigger( params.event );
	},

	_handleListKeydown: function( event ) {
		var target = $( event.target ),
			li = target.closest( "li" );

		// Switch logic based on which key was pressed
		switch ( event.keyCode ) {

		// Up or left arrow keys
		case 38:
			goToAdjacentItem( li, target, "prev" );
			return false;

		// Down or right arrow keys
		case 40:
			goToAdjacentItem( li, target, "next" );
			return false;

		// If enter or space is pressed, trigger click
		case 13:
		case 32:
			target.trigger( "click" );
			return false;
		}
	},

	// Focus the button before the page containing the widget replaces the dialog page
	_handleBeforeTransition: function( event, data ) {
		var focusButton;

		if ( data && data.prevPage && data.prevPage[ 0 ] === this.menuPage[ 0 ] ) {
			focusButton = $.proxy( function() {
				this._delay( function() {
					this._focusButton();
				} );
			}, this );

			if ( data.options && data.options.transition && data.options.transition !== "none" ) {
				data.prevPage.animationComplete( focusButton );
			} else {
				focusButton();
			}
		}
	},

	_handleMenuPageHide: function() {

		// After the dialog's done, we may want to trigger change if the value has actually changed
		this._delayedTrigger();

		// TODO centralize page removal binding / handling in the page plugin.
		// Suggestion from @jblas to do refcounting.
		//
		// TODO extremely confusing dependency on the open method where the pagehide.remove
		// bindings are stripped to prevent the parent page from disappearing. The way we're
		// keeping pages in the DOM right now sucks
		//
		// Rebind the page remove that was unbound in the open function to allow for the parent
		// page removal from actions other than the use of a dialog sized custom select
		//
		// Doing this here provides for the back button on the custom select dialog
		this.thisPage.page( "bindRemove" );
	},

	_handleHeaderCloseClick: function() {
		if ( this.menuType === "overlay" ) {
			this.close();
			return false;
		}
	},

	_handleListItemClick: function( event ) {
		var listItem = $( event.target ).closest( "li" ),

			// Index of option tag to be selected
			oldIndex = this.select[ 0 ].selectedIndex,
			newIndex = $.mobile.getAttribute( listItem, "option-index" ),
			option = this._selectOptions().eq( newIndex )[ 0 ];

		// Toggle selected status on the tag for multi selects
		option.selected = this.isMultiple ? !option.selected : true;

		// Toggle checkbox class for multiple selects
		if ( this.isMultiple ) {
			listItem.find( "a" )
				.toggleClass( "ui-checkbox-on", option.selected )
				.toggleClass( "ui-checkbox-off", !option.selected );
		}

		// If it's not a multiple select, trigger change after it has finished closing
		if ( !this.isMultiple && oldIndex !== newIndex ) {
			this._triggerChange = true;
		}

		// Trigger change if it's a multiple select
		// Hide custom select for single selects only - otherwise focus clicked item
		// We need to grab the clicked item the hard way, because the list may have been rebuilt
		if ( this.isMultiple ) {
			this.select.trigger( "change" );
			this.list.find( "li:not(.ui-listview-item-divider)" ).eq( newIndex )
				.find( "a" ).first().focus();
		} else {
			this.close();
		}

		event.preventDefault();
	},

	build: function() {
		var selectId, popupId, dialogId, label, thisPage, isMultiple, menuId,
			themeAttr, overlayTheme, overlayThemeAttr, dividerThemeAttr,
			menuPage, listbox, list, header, headerTitle, menuPageContent,
			menuPageClose, headerClose,
			o = this.options;

		if ( o.nativeMenu ) {
			return this._super();
		}

		selectId = this.selectId;
		popupId = selectId + "-listbox";
		dialogId = selectId + "-dialog";
		label = this.label;
		thisPage = this.element.closest( ".ui-page" );
		isMultiple = this.element[ 0 ].multiple;
		menuId = selectId + "-menu";
		themeAttr = o.theme ? ( " data-" + $.mobile.ns + "theme='" + o.theme + "'" ) : "";
		overlayTheme = o.overlayTheme || o.theme || null;
		overlayThemeAttr = overlayTheme ? ( " data-" + $.mobile.ns +
		"overlay-theme='" + overlayTheme + "'" ) : "";
		dividerThemeAttr = ( o.dividerTheme && this.element.children( "optgroup" ).length > 0 ) ?
			( " data-" + $.mobile.ns + "divider-theme='" + o.dividerTheme + "'" ) : "";
		menuPage = $( "<div data-" + $.mobile.ns + "role='dialog' class='ui-selectmenu'" +
			themeAttr + overlayThemeAttr + ">" +
			"<div data-" + $.mobile.ns + "type='header'>" +
			"<div class='ui-title'></div>" +
			"</div>" +
			"<div class='ui-content'></div>" +
			"</div>" )
			.attr( "id", dialogId );
		listbox = $( "<div" + themeAttr + overlayThemeAttr +
			" class='ui-selectmenu'></div>" )
			.attr( "id", popupId )
			.insertAfter( this.select )
			.popup();
		list = $( "<ul class='ui-selectmenu-list' role='listbox' aria-labelledby='" +
			this.buttonId + "'" + themeAttr + dividerThemeAttr + "></ul>" )
			.attr( "id", menuId )
			.appendTo( listbox );
		header = $( "<div class='ui-header ui-bar-" + ( o.theme ? o.theme : "inherit" ) + "'></div>" ).prependTo( listbox );
		headerTitle = $( "<h1 class='ui-title'></h1>" ).appendTo( header );

		if ( this.isMultiple ) {
			headerClose = $( "<a>", {
				"role": "button",
				"text": o.closeText,
				"href": "#",
				"class": "ui-button ui-corner-all ui-button-left ui-button-icon-only ui-icon-delete"
			} ).appendTo( header );
		}

		$.extend( this, {
			selectId: selectId,
			menuId: menuId,
			popupId: popupId,
			dialogId: dialogId,
			thisPage: thisPage,
			menuPage: menuPage,
			label: label,
			isMultiple: isMultiple,
			theme: o.theme,
			listbox: listbox,
			list: list,
			header: header,
			headerTitle: headerTitle,
			headerClose: headerClose,
			menuPageContent: menuPageContent,
			menuPageClose: menuPageClose,
			placeholder: ""
		} );

		// Create list from select, update state
		this.refresh();

		this.select.attr( "tabindex", "-1" );
		this._on( this.select, { focus: "_handleSelectFocus" } );

		// Button events
		this._on( this.button, {
			vclick: "_handleButtonVclickKeydown"
		} );

		// Events for list items
		this.list.attr( "role", "listbox" );
		this._on( this.list, {
			"focusin": "_handleListFocus",
			"focusout": "_handleListFocus",
			"keydown": "_handleListKeydown",
			"click li:not(.ui-disabled,.ui-state-disabled,.ui-listview-item-divider)": "_handleListItemClick"
		} );

		// Button refocus ensures proper height calculation by removing the inline style and
		// ensuring page inclusion
		this._on( this.menuPage, { pagehide: "_handleMenuPageHide" } );

		// Events on the popup
		this._on( this.listbox, { popupafterclose: "_popupClosed" } );

		// Close button on small overlays
		if ( this.isMultiple ) {
			this._on( this.headerClose, { click: "_handleHeaderCloseClick" } );
		}

		this._on( this.document, { pagecontainerbeforetransition: "_handleBeforeTransition" } );

		return this;
	},

	_popupClosed: function() {
		this.close();
		this._delayedTrigger();
	},

	_delayedTrigger: function() {
		if ( this._triggerChange ) {
			this.element.trigger( "change" );
		}
		this._triggerChange = false;
	},

	_isRebuildRequired: function() {
		var list = this.list.find( "li" ),
			options = this._selectOptions().not( ".ui-screen-hidden" );

		// TODO exceedingly naive method to determine difference ignores value changes etc in favor
		// of a forcedRebuild from the user in the refresh method
		return options.text() !== list.text();
	},

	selected: function() {
		return this._selectOptions().filter( ":selected:not( :jqmData(placeholder='true') )" );
	},

	refresh: function( force ) {
		var self, indices;

		if ( this.options.nativeMenu ) {
			return this._super( force );
		}

		self = this;
		if ( force || this._isRebuildRequired() ) {
			self._buildList();
		}

		indices = this.selectedIndices();

		self.setButtonText();
		self.setButtonCount();

		self.list.find( "li:not(.ui-listview-item-divider)" )
			.find( "a" ).removeClass( "ui-button-active" ).end()
			.attr( "aria-selected", false )
			.each( function( i ) {
				var item = $( this );
				if ( $.inArray( i, indices ) > -1 ) {

					// Aria selected attr
					item.attr( "aria-selected", true );

					// Multiple selects: add the "on" checkbox state to the icon
					if ( self.isMultiple ) {
						item.find( "a" ).removeClass( "ui-checkbox-off" ).addClass( "ui-checkbox-on" );
					} else {
						if ( item.hasClass( "ui-screen-hidden" ) ) {
							item.next().find( "a" ).addClass( "ui-button-active" );
						} else {
							item.find( "a" ).addClass( "ui-button-active" );
						}
					}
				} else if ( self.isMultiple ) {
					item.find( "a" ).removeClass( "ui-checkbox-on" ).addClass( "ui-checkbox-off" );
				}
			} );
	},

	close: function() {
		if ( this.options.disabled || !this.isOpen ) {
			return;
		}

		var self = this;

		if ( self.menuType === "page" ) {
			if ( self.menuPage.hasClass( "ui-page-active" ) ) {
				$.mobile.back();
			}
			self.list.appendTo( self.listbox );
		} else {
			self.listbox.popup( "close" );
		}

		self._focusButton();
		// Allow the dialog to be closed again
		self.isOpen = false;
	},

	open: function() {
		this.button.click();
	},

	_focusMenuItem: function() {
		var selector = this.list.find( "a.ui-button-active" );
		if ( selector.length === 0 ) {
			selector = this.list.find( "li:not(" + unfocusableItemSelector + ") a.ui-button" );
		}
		selector.first().focus();
	},

	_decideFormat: function() {
		var self = this,
			$window = this.window,
			selfListParent = self.list.parent(),
			menuHeight = selfListParent.outerHeight(),
			scrollTop = $window.scrollTop(),
			buttonOffset = self.button.offset().top,
			screenHeight = $window.height();

		if ( menuHeight > screenHeight - 80 || !$.support.scrollTop ) {

			self.menuPage.appendTo( this.element.closest( ".ui-pagecontainer" ) ).page();
			self.menuPageContent = self.menuPage.find( ".ui-content" );
			self.menuPageClose = self.menuPage.find( ".ui-header a" );

			// Prevent the parent page from being removed from the DOM, otherwise the results of
			// selecting a list item in the dialog fall into a black hole
			self.thisPage.unbind( "pagehide.remove" );

			// For WebOS/Opera Mini (set lastscroll using button offset)
			if ( scrollTop === 0 && buttonOffset > screenHeight ) {
				self.thisPage.one( "pagehide", function() {
					$( this ).jqmData( "lastScroll", buttonOffset );
				} );
			}

			self.menuPage.one( {
				pageshow: $.proxy( this, "_focusMenuItem" ),
				pagehide: $.proxy( this, "close" )
			} );

			self.menuType = "page";
			self.menuPageContent.append( self.list );
			self.menuPage
				.find( "div .ui-title" )
					.text( self.label.getEncodedText() || self.placeholder );
		} else {
			self.menuType = "overlay";

			self.listbox.one( { popupafteropen: $.proxy( this, "_focusMenuItem" ) } );
		}
	},

	_buildList: function() {
		var self = this,
			o = this.options,
			placeholder = this.placeholder,
			needPlaceholder = true,
			dataIcon = "false",
			$options, numOptions, select,
			dataPrefix = "data-" + $.mobile.ns,
			dataIndexAttr = dataPrefix + "option-index",
			dataIconAttr = dataPrefix + "icon",
			dataRoleAttr = dataPrefix + "role",
			dataPlaceholderAttr = dataPrefix + "placeholder",
			fragment = document.createDocumentFragment(),
			isPlaceholderItem = false,
			optGroup,
			i,
			option, $option, parent, text, anchor, classes,
			optLabel, divider, item;

		self.list.empty().filter( ".ui-listview" ).listview( "destroy" );
		$options = this._selectOptions();
		numOptions = $options.length;
		select = this.select[ 0 ];

		for ( i = 0; i < numOptions; i++, isPlaceholderItem = false ) {
			option = $options[ i ];
			$option = $( option );

			// Do not create options based on ui-screen-hidden select options
			if ( $option.hasClass( "ui-screen-hidden" ) ) {
				continue;
			}

			parent = option.parentNode;
			classes = [];

			// Although using .text() here raises the risk that, when we later paste this into the
			// list item we end up pasting possibly malicious things like <script> tags, that risk
			// only arises if we do something like $( "<li><a href='#'>" + text + "</a></li>" ). We
			// don't do that. We do document.createTextNode( text ) instead, which guarantees that
			// whatever we paste in will end up as text, with characters like <, > and & escaped.
			text = $option.text();
			anchor = document.createElement( "a" );
			anchor.setAttribute( "href", "#" );
			anchor.appendChild( document.createTextNode( text ) );

			// Are we inside an optgroup?
			if ( parent !== select && parent.nodeName.toLowerCase() === "optgroup" ) {
				optLabel = parent.getAttribute( "label" );
				if ( optLabel !== optGroup ) {
					divider = document.createElement( "li" );
					divider.setAttribute( dataRoleAttr, "list-divider" );
					divider.setAttribute( "role", "option" );
					divider.setAttribute( "tabindex", "-1" );
					divider.appendChild( document.createTextNode( optLabel ) );
					fragment.appendChild( divider );
					optGroup = optLabel;
				}
			}

			if ( needPlaceholder && ( !option.getAttribute( "value" ) || text.length === 0 || $option.jqmData( "placeholder" ) ) ) {
				needPlaceholder = false;
				isPlaceholderItem = true;

				// If we have identified a placeholder, record the fact that it was us who have
				// added the placeholder to the option. Mark it retroactively in the select.
				if ( null === option.getAttribute( dataPlaceholderAttr ) ) {
					this._removePlaceholderAttr = true;
				}
				option.setAttribute( dataPlaceholderAttr, true );
				if ( o.hidePlaceholderMenuItems ) {
					classes.push( "ui-screen-hidden" );
				}
				if ( placeholder !== text ) {
					placeholder = self.placeholder = text;
				}
			}

			item = document.createElement( "li" );
			if ( option.disabled ) {
				classes.push( "ui-state-disabled" );
				item.setAttribute( "aria-disabled", true );
			}
			item.setAttribute( dataIndexAttr, i );
			item.setAttribute( dataIconAttr, dataIcon );
			if ( isPlaceholderItem ) {
				item.setAttribute( dataPlaceholderAttr, true );
			}
			item.className = classes.join( " " );
			item.setAttribute( "role", "option" );
			anchor.setAttribute( "tabindex", "-1" );
			if ( this.isMultiple ) {
				$( anchor ).addClass( "ui-button ui-checkbox-off ui-icon-end" );
			}

			item.appendChild( anchor );
			fragment.appendChild( item );
		}

		self.list[ 0 ].appendChild( fragment );

		// Hide header if it's not a multiselect and there's no placeholder
		if ( !this.isMultiple && !placeholder.length ) {
			this.header.addClass( "ui-screen-hidden" );
		} else {
			this.headerTitle.text( this.placeholder );
		}

		// Now populated, create listview
		self.list.listview();
	},

	_button: function() {
		var attributes = {
				"href": "#",
				"role": "button",
				// TODO value is undefined at creation
				"id": this.buttonId,
				"aria-haspopup": "true",

				// TODO value is undefined at creation
				"aria-owns": this.menuId
			};

		if ( this._origTabIndex ) {
			attributes.tabindex = this._origTabIndex;
		}
		return this.options.nativeMenu ? this._super() : $( "<a>", attributes );
	},

	_destroy: function() {

		if ( !this.options.nativeMenu ) {
			this.close();

			// Restore the tabindex attribute to its original value
			if ( this._origTabIndex !== undefined ) {
				if ( this._origTabIndex !== false ) {
					this.select.attr( "tabindex", this._origTabIndex );
				} else {
					this.select.removeAttr( "tabindex" );
				}
			}

			// Remove the placeholder attribute if we were the ones to add it
			if ( this._removePlaceholderAttr ) {
				this._selectOptions().removeAttr( "data-" + $.mobile.ns + "placeholder" );
			}

			// Remove the popup
			this.listbox.remove();

			// Remove the dialog
			this.menuPage.remove();
		}

		// Chain up
		this._super();
	}
} );

} );
