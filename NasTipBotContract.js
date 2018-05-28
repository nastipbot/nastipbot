"use strict";

var Account = function (text) {
	if (text) {
		var o = JSON.parse(text);
		this.balance = new BigNumber(o.balance);
		this.socialNetworkAccount1 = o.socialNetworkAccount1;
		this.socialNetworkAccount2 = o.socialNetworkAccount2;
		this.socialNetworkAccount3 = o.socialNetworkAccount3;
		this.socialNetworkAccount4 = o.socialNetworkAccount4;
		this.socialNetworkAccount5 = o.socialNetworkAccount5;
		this.socialNetworkAccount6 = o.socialNetworkAccount6;
		this.socialNetworkAccount7 = o.socialNetworkAccount7;
		this.socialNetworkAccount8 = o.socialNetworkAccount8;
		this.socialNetworkAccount9 = o.socialNetworkAccount9;
		this.socialNetworkAccount10 = o.socialNetworkAccount10;
		this.walletAddress = o.walletAddress;
		
		this.lastDepositTS = null;
		this.lastDepositAmount = null;
		this.lastWithdrawalTS = null;
		this.lastWithdrawalAmount = null;
		
		if(o.lastDepositTS) {
			this.lastDepositTS = new BigNumber(o.lastDepositTS);
		}
		if(o.lastWithdrawalTS) {
			this.lastWithdrawalTS = new BigNumber(o.lastWithdrawalTS);
		}
		if(o.lastDepositAmount) {
			this.lastDepositAmount = new BigNumber(o.lastDepositAmount);
		}
		if(o.lastWithdrawalAmount) {
			this.lastWithdrawalAmount = new BigNumber(o.lastWithdrawalAmount);
		}
		
		this.lastActionTS = null;
		if(o.lastActionTS) {
			this.lastActionTS = new BigNumber(o.lastActionTS);
		}
		this.botAccessExpirationTS = null;
		if(o.botAccessExpirationTS) {
			this.botAccessExpirationTS = new BigNumber(o.botAccessExpirationTS);
		}
		this.registrationCode = o.registrationCode;
	} else {
		this.balance = new BigNumber(0);
		this.socialNetworkAccount1 = null;
		this.socialNetworkAccount2 = null;
		this.socialNetworkAccount3 = null;
		this.socialNetworkAccount4 = null;
		this.socialNetworkAccount5 = null;
		this.socialNetworkAccount6 = null;
		this.socialNetworkAccount7 = null;
		this.socialNetworkAccount8 = null;
		this.socialNetworkAccount9 = null;
		this.socialNetworkAccount10 = null;
		this.walletAddress = null;
		this.lastDepositTS = null;
		this.lastDepositAmount = null;
		this.lastWithdrawalTS = null;
		this.lastWithdrawalAmount = null;
		this.lastActionTS = new BigNumber(new Date().getTime() / 1000);
		this.botAccessExpirationTS = null;
		this.registrationCode = null;
	}
};

Account.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var NasTipBotContract = function () {
    LocalContractStorage.defineMapProperty(this, "accounts", {
		parse: function (text) {
			return new Account(text);
		},
		stringify: function (o) {
			return o.toString();
		}
    });
    LocalContractStorage.defineMapProperty(this, "unregisteredAccountBalances", {
		parse: function (text) {
			return new BigNumber(text);
		},
		stringify: function (o) {
			return o.toString();
		}
    });
    LocalContractStorage.defineMapProperty(this, "arrayMap");
    LocalContractStorage.defineProperty(this, "size");
    LocalContractStorage.defineProperty(this, "owner");
    LocalContractStorage.defineProperty(this, "withdrawalFee");
    LocalContractStorage.defineProperty(this, "maxDepositSizePerDay");
    LocalContractStorage.defineProperty(this, "maxWithdrawalSizePerDay");
    LocalContractStorage.defineProperty(this, "depositsEnabled");
    LocalContractStorage.defineProperty(this, "withdrawalsEnabled");
};
NasTipBotContract.prototype = {
    init: function() {
    	this.size = 0;
    	this.depositsEnabled = "true";
    	this.withdrawalsEnabled = "true";
    	this.maxDepositSizePerDay = new BigNumber(5000000000000000000);
    	this.maxWithdrawalSizePerDay = new BigNumber(5000000000000000000);
    	this.withdrawalFee = new BigNumber(0.01);
    	this.owner = Blockchain.transaction.from;
    	
    	var tipBot = new Account();
    	tipBot.walletAddress = this.owner;
    	this.arrayMap.set(this.size, this.owner);
    	this.size += 1;
    	this.accounts.put(this.owner, tipBot);
    },
    register: function(registrationCode)
    {
    	var from = Blockchain.transaction.from;
    	var account = this.accounts.get(from);
    	
    	if(!account)
    	{
        	account = new Account();
        	account.walletAddress = from;
        	this.arrayMap.set(this.size, from);
        	this.size += 1;
    	}
    	account.registrationCode = registrationCode;

    	this.accounts.put(from, account);
    	
    	this.authorizeBot();
    	
    	return registrationCode;
    },
    deposit: function() {
    	var from = Blockchain.transaction.from;
		var value = Blockchain.transaction.value;
		
		if(this.depositsEnabled !== "true")
		{
			throw new Error("Deposits are temporarily unavailable.");
		}
		
		var account = this.accounts.get(from);
		
		if(!account)
		{
			this.register(null);
			account = this.accounts.get(from);
		}
		
		if(account.lastDepositTS && account.lastDepositAmount)
		{
			var sameDay = false;
			var currentTime = new Date();
			var lastDeposit = new Date(account.lastDepositTS.toString() * 1000);
			
			if(currentTime.getFullYear() === lastDeposit.getFullYear() &&
					currentTime.getMonth() === lastDeposit.getMonth() &&
					currentTime.getDate() === lastDeposit.getDate())
			{
				if(value.plus(account.lastDepositAmount).gt(this.maxDepositSizePerDay))
				{
					throw new Error("Daily deposit limit would be exceeded with this transaction.");
				}
			}
			else
			{
				account.lastDepositAmount = new BigNumber(0);
			}
		}
		else if(value.gt(this.maxDepositSizePerDay))
		{
			throw new Error("Daily deposit limit would be exceeded with this transaction.");
		}
		
		account.balance = value.plus(account.balance);
		account.lastDepositTS = new BigNumber(new Date().getTime() / 1000);
		account.lastActionTS = new BigNumber(new Date().getTime() / 1000);
		
		var depositsToday = new BigNumber(0);
		if(account.lastDepositAmount)
		{
			depositsToday = account.lastDepositAmount;
		}
		account.lastDepositAmount = value.plus(depositsToday);
		
		this.accounts.put(from, account);
		return true;
    },
    _getAccountByName: function(socialNetwork, accountName) {
    	if(!socialNetwork || socialNetwork === "") {
    		throw new Error("Social network not specified.");
    	}
    	if(!accountName || accountName === "") {
    		throw new Error("Account name not specified.");
    	}
    	
    	for(var i=0;i<this.size;i++){
    		var key = this.arrayMap.get(i);
            var account = this.accounts.get(key);
            
            if(account)
            {
            	if((socialNetwork === "1" && account.socialNetworkAccount1 === accountName) ||
            			(socialNetwork === "2" && account.socialNetworkAccount2 === accountName) ||
            			(socialNetwork === "3" && account.socialNetworkAccount3 === accountName) ||
            			(socialNetwork === "4" && account.socialNetworkAccount4 === accountName) ||
            			(socialNetwork === "5" && account.socialNetworkAccount5 === accountName) ||
            			(socialNetwork === "6" && account.socialNetworkAccount6 === accountName) ||
            			(socialNetwork === "7" && account.socialNetworkAccount7 === accountName) ||
            			(socialNetwork === "8" && account.socialNetworkAccount8 === accountName) ||
            			(socialNetwork === "9" && account.socialNetworkAccount9 === accountName) ||
            			(socialNetwork === "10" && account.socialNetworkAccount10 === accountName))
            	{
            		return account;
            	}
            }
    	}
    },
	isAccountRegistered: function() {
    	var from = Blockchain.transaction.from;
    	var account = this.accounts.get(from);
		
		if(!account)
		{
			throw new Error("Account not registered.");
		}
		else
		{
			return true;
		}
    },
	balance: function() {
    	var from = Blockchain.transaction.from;
    	var account = this.accounts.get(from);
		
		if(!account)
		{
			throw new Error("Account not registered.");
		}
		else
		{
			return account.balance;
		}
    },
    authorizeBot: function(authorizationTime)
    {
    	if(!authorizationTime)
    	{
    		authorizationTime = new BigNumber(86400);
    	}
    	else
    	{
    		authorizationTime = new BigNumber(authorizationTime);
    	}
    	var from = Blockchain.transaction.from;
    	var account = this.accounts.get(from);
    	
    	if(!account)
		{
			throw new Error("Account not registered.");
		}
    	
    	account.botAccessExpirationTS = new BigNumber((new Date().getTime() / 1000)).plus(authorizationTime);
    	this.accounts.put(from, account);
    	return authorizationTime;
    },
    revokeBotAuthorization: function()
    {
    	var from = Blockchain.transaction.from;
    	var account = this.accounts.get(from);
    	
    	if(!account)
		{
			throw new Error("Account not registered.");
		}
    	
    	account.botAccessExpirationTS = null;
    	this.accounts.put(from, account);
    	return true;
    },
	accountDetails: function(socialNetwork, accountName) {
    	if(!socialNetwork || socialNetwork === "") {
    		throw new Error("Invalid social network");
    	}
		if(!accountName || accountName === "") {
    		throw new Error("Invalid account name");
    	}

		var account = this._getAccountByName(socialNetwork, accountName);
			
		if(!account)
		{
			throw new Error("Account not registered.");
		}
		else
		{
			return JSON.stringify(account);
		}
    },
	accountDetailsByWallet: function(walletAddress) {
    	if(!walletAddress || walletAddress === "") {
    		throw new Error("Invalid wallet address");
    	}

		var account = this.accounts.get(walletAddress);
			
		if(!account)
		{
			throw new Error("Account not registered.");
		}
		else
		{
			return JSON.stringify(account);
		}
    },
    botAssign: function(walletAddress, socialNetwork, accountName) {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!walletAddress || walletAddress === "") {
        		throw new Error("Invalid wallet address.");
        	}
        	if(!socialNetwork || socialNetwork === "") {
        		throw new Error("Invalid social network");
        	}
    		if(!accountName || accountName === "") {
        		throw new Error("Invalid account name");
        	}
    		
    		var account = this.accounts.get(walletAddress);
    		if (account) {
    			
    			if(account.botAccessExpirationTS == null || (account.botAccessExpirationTS != null && new BigNumber((new Date().getTime() / 1000)).gt(account.botAccessExpirationTS)))
    			{
    				throw new Error("Please authorize the NAS tip bot to access your account.");
    			}
    			
    			if(socialNetwork === "1") {
    				account.socialNetworkAccount1 = accountName;
    			}
    			else if(socialNetwork === "2") {
    				account.socialNetworkAccount2 = accountName;
    			}
    			else if(socialNetwork === "3") {
    				account.socialNetworkAccount3 = accountName;
    			}
    			else if(socialNetwork === "4") {
    				account.socialNetworkAccount4 = accountName;
    			}
    			else if(socialNetwork === "5") {
    				account.socialNetworkAccount5 = accountName;
    			}
    			else if(socialNetwork === "6") {
    				account.socialNetworkAccount6 = accountName;
    			}
    			else if(socialNetwork === "7") {
    				account.socialNetworkAccount7 = accountName;
    			}
    			else if(socialNetwork === "8") {
    				account.socialNetworkAccount8 = accountName;
    			}
    			else if(socialNetwork === "9") {
    				account.socialNetworkAccount9 = accountName;
    			}
    			else if(socialNetwork === "10") {
    				account.socialNetworkAccount10 = accountName;
    			}
    			
        		var currentBalance = this.unregisteredAccountBalances.get(socialNetwork + "_" + accountName);
        		if(currentBalance)
        		{
        			
        			account.balance = account.balance.plus(currentBalance);
        			this.unregisteredAccountBalances.put(socialNetwork + "_" + accountName, new BigNumber(0));
        		}
    			
    			this.accounts.put(walletAddress, account);
    			return true;
    		}
    		throw new Error("Account not registered.");
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botTip: function(socialNetwork, fromName, toName, amount) {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
    		var fromAccount = this._getAccountByName(socialNetwork, fromName);
    		
    		if(!fromAccount)
    		{
    			throw new Error("Account not registered.");
    		}
			if(fromAccount.botAccessExpirationTS == null || (fromAccount.botAccessExpirationTS != null && new BigNumber((new Date().getTime() / 1000)).gt(fromAccount.botAccessExpirationTS)))
			{
				throw new Error("Please authorize the NAS tip bot to access your account.");
			}
    		else if(!amount)
    		{
    			throw new Error("Amount not specified.");
    		}		
    		
    		amount = new BigNumber(amount);
    		
    		if (amount.gt(fromAccount.balance)) {
    			throw new Error("Insufficient balance.");
    		}
    		
    		var toAccount = this._getAccountByName(socialNetwork, toName);
    		
    		if(!toAccount)
    		{
        		var currentBalance = this.unregisteredAccountBalances.get(socialNetwork + "_" + toName);
        		if(!currentBalance)
        		{
        			currentBalance = new BigNumber(0);
        		}
        		
        		this.unregisteredAccountBalances.put(socialNetwork + "_" + toName, amount.plus(currentBalance));
    		}
    		else
    		{
    			toAccount.balance = amount.plus(toAccount.balance);
    			toAccount.lastActionTS = new BigNumber(new Date().getTime() / 1000);
    			this.accounts.put(toAccount.walletAddress, toAccount);
    		}
    		
    		fromAccount.balance = fromAccount.balance.minus(amount);
    		fromAccount.lastActionTS = new BigNumber(new Date().getTime() / 1000);
    		this.accounts.put(fromAccount.walletAddress, fromAccount);
    		
    		return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botExpireDeposits: function(maxInactiveDays)
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!maxInactiveDays || maxInactiveDays === "")
        	{
        		throw new Error("Max inactive days not specified.");
        	}
        	else
        	{
        		maxInactiveDays = new BigNumber(maxInactiveDays);
        		maxInactiveDays = maxInactiveDays.times(86400);
        	}
        	
	    	for(var i=0;i<this.size;i++){
	    		var key = this.arrayMap.get(i);
	            var account = this.accounts.get(key);
	            
	            if(account)
	            {
	            	if(account.walletAddress != this.owner)
	            	{
		            	if(new BigNumber((new Date().getTime() / 1000)).gt(account.lastActionTS.plus(maxInactiveDays)))
		            	{
		            		try {
		            			this._withdrawal(account, account.balance);
		            		}
		            		catch(err) {
		            		}
		            	}
	            	}
	            }
	    	}
	    	return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    _withdrawal: function(account,amount)
    {
		if(!account)
		{
			throw new Error("Account not registered.");
		}
		else if(this.withdrawalsEnabled !== "true")
		{
			throw new Error("Withdrawals are temporarily unavailable.");
		}
		else if(!amount)
		{
			amount = account.balance;
		}
		else
		{
			amount = new BigNumber(amount);
		}
		
		if (amount.gt(account.balance) || account.balance.eq(new BigNumber(0))) {
			throw new Error("Insufficient balance.");
		}
		
		if(account.lastWithdrawalTS && account.lastWithdrawalAmount)
		{
			var sameDay = false;
			var currentTime = new Date();
			var lastWithdrawal = new Date(account.lastWithdrawalTS.toString() * 1000);
			
			if(currentTime.getFullYear() === lastWithdrawal.getFullYear() &&
					currentTime.getMonth() === lastWithdrawal.getMonth() &&
					currentTime.getDate() === lastWithdrawal.getDate())
			{
				if(amount.plus(account.lastWithdrawalAmount).gt(this.maxWithdrawalSizePerDay))
				{
					throw new Error("Daily withdrawal limit would be exceeded with this transaction.");
				}
			}
			else
			{
				account.lastWithdrawalAmount = new BigNumber(0);
			}
		}
		else if(amount.gt(this.maxWithdrawalSizePerDay))
		{
			throw new Error("Daily withdrawal limit would be exceeded with this transaction.");
		}
		
		var fee = amount.times(this.withdrawalFee)
		var withdrawalAmount = amount.minus(fee)
		
		if(account.walletAddress === this.owner)
		{
			withdrawalAmount = amount;
		}
		
		var result = Blockchain.transfer(account.walletAddress, withdrawalAmount);
		if (!result) {
			throw new Error("Withdrawal failed.");
		}

		Event.Trigger("NasTipBot", {
			Transfer: {
				from: Blockchain.transaction.to,
				to: account.walletAddress,
				value: withdrawalAmount.toString()
			}
		});
		
		account.balance = account.balance.sub(amount);
		account.lastActionTS = new BigNumber(new Date().getTime() / 1000);
		account.lastWithdrawalTS = new BigNumber(new Date().getTime() / 1000);
		
		var withdrawalsToday = new BigNumber(0);
		if(account.lastWithdrawalAmount)
		{
			withdrawalsToday = account.lastWithdrawalAmount;
		}
		account.lastWithdrawalAmount = amount.plus(withdrawalsToday);
		
		this.accounts.put(account.walletAddress, account);
		
		if(account.walletAddress !== this.owner)
		{
			var tipBot = this.accounts.get(this.owner);
			tipBot.balance = tipBot.balance.plus(fee);
			tipBot.lastActionTS = new BigNumber(new Date().getTime() / 1000);
			this.accounts.put(tipBot.walletAddress, tipBot);
		}
    },
    withdrawal: function(amount) {
    	var from = Blockchain.transaction.from;
    	var account = this.accounts.get(from);
    	
    	if(!amount || amount === "") {
    		throw new Error("Amount not specified.");
    	}
    	
    	this._withdrawal(account, amount);
    	return true;
    },
    botDepositsEnabled: function(depositsEnabled)
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!depositsEnabled || depositsEnabled === "") {
        		throw new Error("Deposits enabled not specified.");
        	}
        	else if(depositsEnabled !== "true" && depositsEnabled !== "false")
        	{
        		throw new Error("Invalid deposits enabled value.");
        	}
    		this.depositsEnabled = depositsEnabled;
    		return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botWithdrawalsEnabled: function(withdrawalsEnabled)
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!withdrawalsEnabled || withdrawalsEnabled === "") {
        		throw new Error("Withdrawals enabled not specified.");
        	}
        	else if(withdrawalsEnabled !== "true" && withdrawalsEnabled !== "false")
        	{
        		throw new Error("Invalid withdrawals enabled value.");
        	}
    		this.withdrawalsEnabled = withdrawalsEnabled;
    		return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botUpdateFee: function(fee)
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!fee || fee === "") {
        		throw new Error("Missing fee.");
        	}
    		this.withdrawalFee = new BigNumber(fee);
    		return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botMaxWithdrawalSizePerDay: function(maxWithdrawalSizePerDay)
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!maxWithdrawalSizePerDay || maxWithdrawalSizePerDay === "") {
        		throw new Error("Missing max withdrawal size per day.");
        	}
    		this.maxWithdrawalSizePerDay = new BigNumber(maxWithdrawalSizePerDay);
    		return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botMaxDepositSizePerDay: function(maxDepositSizePerDay)
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
        	if(!maxDepositSizePerDay || maxDepositSizePerDay === "") {
        		throw new Error("Missing max withdrawal size per day.");
        	}
    		this.maxDepositSizePerDay = new BigNumber(maxDepositSizePerDay);
    		return true;
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    },
    botGetSettings: function()
    {
    	var from = Blockchain.transaction.from;
    	if(from === this.owner)
    	{
    			var obj = new Object();
        		obj.withdrawalFee = this.withdrawalFee;
        		obj.maxWithdrawalSizePerDay  = this.maxWithdrawalSizePerDay;
        		obj.maxDepositSizePerDay = this.maxDepositSizePerDay;
        		obj.depositsEnabled  = this.depositsEnabled;
        		obj.withdrawalsEnabled = this.withdrawalsEnabled;
        		return JSON.stringify(obj);
    	}
    	else
    	{
    		throw new Error("Access denied.");
    	}
    }
};
module.exports = NasTipBotContract;
