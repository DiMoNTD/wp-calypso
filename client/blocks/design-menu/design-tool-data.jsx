/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';
import debugFactory from 'debug';
import omit from 'lodash/omit';

/**
 * Internal dependencies
 */
import { getSelectedSite, getSelectedSiteId } from 'state/ui/selectors';
import { getPreviewCustomizations } from 'state/preview/selectors';
import { updateCustomizations } from 'state/preview/actions';
import { requestSitePosts } from 'state/posts/actions';

const debug = debugFactory( 'calypso:design-tool-data' );

export default function designTool( Component ) {
	const DesignToolData = React.createClass( {
		propTypes: {
			// This is the key for the customizations in the Redux store (under preview)
			previewDataKey: React.PropTypes.string.isRequired,
			// These are provided by the connect method
			updateCustomizations: React.PropTypes.func.isRequired,
			customizations: React.PropTypes.object,
			selectedSiteId: React.PropTypes.number,
			selectedSite: React.PropTypes.object,
			allPages: React.PropTypes.array,
			requestSitePosts: React.PropTypes.func.isRequired,
		},

		getDefaultProps() {
			return {
				customizations: {},
			};
		},

		getUpdatedCustomizationsForKey( id, customizations ) {
			const updatedCustomizations = { [ id ]: Object.assign( {}, this.getCustomizationsForKey( id ), customizations ) };
			return Object.assign( {}, this.props.customizations, updatedCustomizations );
		},

		buildOnChangeFor( id ) {
			return customizations => {
				const newCustomizations = this.getUpdatedCustomizationsForKey( id, customizations );
				debug( `changed customizations for "${id}" to`, newCustomizations );
				return this.props.updateCustomizations( this.props.selectedSiteId, newCustomizations );
			};
		},

		getDefaultChildProps() {
			return { onChange: this.buildOnChangeFor( this.props.previewDataKey ) };
		},

		getCustomizationsForKey( key ) {
			return this.props.customizations[ key ] || {};
		},

		getChildProps() {
			return Object.assign( {}, this.getDefaultChildProps(), { values: this.getCustomizationsForKey( this.props.previewDataKey ) } );
		},

		render() {
			const myProps = omit( this.props, [ 'previewDataKey' ] );
			const props = Object.assign( {}, myProps, this.getChildProps() );
			return <Component { ...props } />;
		}
	} );

	function mapStateToProps( state ) {
		const selectedSiteId = getSelectedSiteId( state );
		const selectedSite = getSelectedSite( state ) || {};
		const allPages = Object.keys( state.posts.items )
			.map( key => state.posts.items[ key ] )
			.filter( post => post.type === 'page' );
		return {
			selectedSiteId,
			selectedSite,
			customizations: getPreviewCustomizations( state, selectedSiteId ),
			allPages,
		};
	}

	return connect( mapStateToProps, { updateCustomizations, requestSitePosts } )( DesignToolData );
}