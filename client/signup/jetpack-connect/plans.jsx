/**
 * External dependencies
 */
import { connect } from 'react-redux';
import page from 'page';
import React from 'react';
import { bindActionCreators } from 'redux';

/**
 * Internal dependencies
 */
import { getPlansBySite } from 'state/sites/plans/selectors';
import { getFlowType } from 'state/jetpack-connect/selectors';
import Main from 'components/main';
import StepHeader from '../step-header';
import observe from 'lib/mixins/data-observe';
import PlansFeaturesMain from 'my-sites/plans-features-main';
import { recordTracksEvent } from 'state/analytics/actions';
import { getCurrentUser } from 'state/current-user/selectors';
import * as upgradesActions from 'lib/upgrades/actions';
import { userCan } from 'lib/site/utils';
import { getAuthorizationData, isCalypsoStartedConnection } from 'state/jetpack-connect/selectors';
import { goBackToWpAdmin } from 'state/jetpack-connect/actions';
import QueryPlans from 'components/data/query-plans';
import QuerySitePlans from 'components/data/query-site-plans';
import { requestPlans } from 'state/plans/actions';
import { isRequestingPlans, getPlanBySlug } from 'state/plans/selectors';

const CALYPSO_REDIRECTION_PAGE = '/posts/';

const Plans = React.createClass( {
	mixins: [ observe( 'sites', 'plans' ) ],

	propTypes: {
		cart: React.PropTypes.object.isRequired,
		context: React.PropTypes.object.isRequired,
		destinationType: React.PropTypes.string,
		sites: React.PropTypes.object.isRequired,
		sitePlans: React.PropTypes.object.isRequired,
		showJetpackFreePlan: React.PropTypes.bool,
		intervalType: React.PropTypes.string
	},

	getDefaultProps() {
		return {
			intervalType: 'yearly'
		};
	},

	componentDidMount() {
		this.props.recordTracksEvent( 'calypso_jpc_plans_view', {
			user: this.props.userId
		} );

		if ( this.props.flowType === 'pro' || this.props.flowType === 'premium' ) {
			return this.autoselectPlan();
		}
	},

	componentDidUpdate() {
		if ( this.hasPlan( this.props.selectedSite ) ) {
			page.redirect( CALYPSO_REDIRECTION_PAGE + this.props.selectedSite.slug );
		}
		if ( ! this.props.canPurchasePlans ) {
			page.redirect( CALYPSO_REDIRECTION_PAGE + this.props.selectedSite.slug );
		}

		if ( ! this.props.isRequestingPlans && ( this.props.flowType === 'pro' || this.props.flowType === 'premium' ) ) {
			return this.autoselectPlan();
		}
	},

	hasPlan( site ) {
		return site &&
			site.plan &&
			( site.plan.product_slug === 'jetpack_business' || site.plan.product_slug === 'jetpack_premium' );
	},

	autoselectPlan() {
		if ( this.props.flowType === 'pro' ) {
			this.props.requestPlans();
			const plan = this.props.getPlanBySlug( 'jetpack_business' );
			if ( plan ) {
				this.selectPlan( plan );
				return;
			}
		}
		if ( this.props.flowType === 'premium' ) {
			this.props.requestPlans();
			const plan = this.props.getPlanBySlug( 'jetpack_premium' );
			if ( plan ) {
				this.selectPlan( plan );
				return;
			}
		}
	},

	selectFreeJetpackPlan() {
		this.props.recordTracksEvent( 'calypso_jpc_plans_submit_free', {
			user: this.props.userId
		} );
		if ( this.props.calypsoStartedConnection ) {
			page.redirect( CALYPSO_REDIRECTION_PAGE + this.props.selectedSite.slug );
		} else {
			const { queryObject } = this.props.jetpackConnectAuthorize;
			this.props.goBackToWpAdmin( queryObject.redirect_after_auth );
		}
	},

	selectPlan( cartItem ) {
		const checkoutPath = `/checkout/${ this.props.selectedSite.slug }`;
		if ( cartItem.product_slug === 'jetpack_free' ) {
			return this.selectFreeJetpackPlan();
		}
		if ( cartItem.product_slug === 'jetpack_premium' ) {
			this.props.recordTracksEvent( 'calypso_jpc_plans_submit_99', {
				user: this.props.userId
			} );
		}
		if ( cartItem.product_slug === 'jetpack_business' ) {
			this.props.recordTracksEvent( 'calypso_jpc_plans_submit_299', {
				user: this.props.userId
			} );
		}
		upgradesActions.addItem( cartItem );
		page( checkoutPath );
	},

	render() {
		if ( this.props.flowType === 'pro' || this.props.flowType === 'premium' ) {
			return null;
		}

		if ( ! this.props.canPurchasePlans || this.hasPlan( this.props.selectedSite ) ) {
			return null;
		}

		return (
			<div>
				<Main wideLayout>
					<QueryPlans />
					<QuerySitePlans siteId={ this.props.selectedSite.ID } />
					<div className="jetpack-connect__plans">
						<StepHeader
							headerText={ this.translate( 'Your site is now connected!' ) }
							subHeaderText={ this.translate( 'Now pick a plan that\'s right for you.' ) }
							step={ 1 }
							steps={ 3 } />

						<div id="plans">
							<PlansFeaturesMain
								site={ this.props.selectedSite }
								isInSignup={ true }
								isInJetpackConnect={ true }
								onUpgradeClick={ this.selectPlan }
								intervalType={ this.props.intervalType } />
						</div>
					</div>
				</Main>
			</div>
		);
	}
} );

export default connect(
	( state, props ) => {
		const user = getCurrentUser( state );
		const selectedSite = props.sites.getSelectedSite();

		const searchPlanBySlug = ( planSlug ) => {
			return getPlanBySlug( state, planSlug );
		};

		return {
			selectedSite,
			sitePlans: getPlansBySite( state, selectedSite ),
			jetpackConnectAuthorize: getAuthorizationData( state ),
			userId: user ? user.ID : null,
			canPurchasePlans: userCan( 'manage_options', selectedSite ),
			flowType: getFlowType( state, selectedSite && selectedSite.slug ),
			isRequestingPlans: isRequestingPlans( state ),
			getPlanBySlug: searchPlanBySlug,
			calypsoStartedConnection: isCalypsoStartedConnection( state, selectedSite.slug )
		};
	},
	( dispatch ) => {
		return Object.assign( {},
			bindActionCreators( { goBackToWpAdmin, requestPlans }, dispatch ),
			{
				recordTracksEvent( eventName, props ) {
					dispatch( recordTracksEvent( eventName, props ) );
				}
			}
		);
	}
)( Plans );
