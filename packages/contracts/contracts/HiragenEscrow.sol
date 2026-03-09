// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HiragenEscrow
 * @notice Escrow contract for the Hiragen AI agent marketplace.
 * Users deposit funds when creating tasks. Funds are released to agents
 * upon task completion, or refunded if the task is cancelled.
 */
contract HiragenEscrow {
    enum EscrowStatus {
        Created,
        Funded,
        Released,
        Refunded,
        Disputed
    }

    struct Escrow {
        address client;
        address agent;
        uint256 amount;
        string taskId;
        EscrowStatus status;
        uint256 createdAt;
    }

    address public owner;
    uint256 public platformFeePercent; // basis points (100 = 1%)
    uint256 public escrowCount;

    mapping(uint256 => Escrow) public escrows;
    mapping(string => uint256) public taskToEscrow;

    event EscrowCreated(uint256 indexed escrowId, address indexed client, string taskId, uint256 amount);
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event AgentAssigned(uint256 indexed escrowId, address indexed agent);
    event FundsReleased(uint256 indexed escrowId, address indexed agent, uint256 amount);
    event FundsRefunded(uint256 indexed escrowId, address indexed client, uint256 amount);
    event DisputeRaised(uint256 indexed escrowId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyClient(uint256 _escrowId) {
        require(msg.sender == escrows[_escrowId].client, "Not client");
        _;
    }

    constructor(uint256 _platformFeePercent) {
        require(_platformFeePercent <= 1000, "Fee too high");
        owner = msg.sender;
        platformFeePercent = _platformFeePercent;
    }

    function createEscrow(string calldata _taskId) external payable {
        require(msg.value > 0, "Must send funds");
        require(
            taskToEscrow[_taskId] == 0 ||
            escrows[taskToEscrow[_taskId]].status == EscrowStatus.Refunded,
            "Task already has active escrow"
        );

        escrowCount++;
        uint256 escrowId = escrowCount;

        escrows[escrowId] = Escrow({
            client: msg.sender,
            agent: address(0),
            amount: msg.value,
            taskId: _taskId,
            status: EscrowStatus.Funded,
            createdAt: block.timestamp
        });

        taskToEscrow[_taskId] = escrowId;

        emit EscrowCreated(escrowId, msg.sender, _taskId, msg.value);
        emit EscrowFunded(escrowId, msg.value);
    }

    function assignAgent(uint256 _escrowId, address _agent) external onlyClient(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(_agent != address(0), "Invalid agent");

        escrow.agent = _agent;
        emit AgentAssigned(_escrowId, _agent);
    }

    function releaseFunds(uint256 _escrowId) external onlyClient(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Funded, "Not funded");
        require(escrow.agent != address(0), "No agent assigned");

        escrow.status = EscrowStatus.Released;

        uint256 fee = (escrow.amount * platformFeePercent) / 10000;
        uint256 agentPayout = escrow.amount - fee;

        (bool sentAgent, ) = payable(escrow.agent).call{value: agentPayout}("");
        require(sentAgent, "Agent payment failed");

        if (fee > 0) {
            (bool sentOwner, ) = payable(owner).call{value: fee}("");
            require(sentOwner, "Fee payment failed");
        }

        emit FundsReleased(_escrowId, escrow.agent, agentPayout);
    }

    function refund(uint256 _escrowId) external onlyClient(_escrowId) {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Funded, "Not funded");

        escrow.status = EscrowStatus.Refunded;

        (bool sent, ) = payable(escrow.client).call{value: escrow.amount}("");
        require(sent, "Refund failed");

        emit FundsRefunded(_escrowId, escrow.client, escrow.amount);
    }

    function raiseDispute(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(
            msg.sender == escrow.client || msg.sender == escrow.agent,
            "Not party to escrow"
        );
        require(escrow.status == EscrowStatus.Funded, "Not funded");

        escrow.status = EscrowStatus.Disputed;
        emit DisputeRaised(_escrowId);
    }

    function resolveDispute(uint256 _escrowId, bool _releaseToAgent) external onlyOwner {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.Disputed, "Not disputed");

        if (_releaseToAgent) {
            escrow.status = EscrowStatus.Released;
            uint256 fee = (escrow.amount * platformFeePercent) / 10000;
            uint256 agentPayout = escrow.amount - fee;

            (bool sentAgent, ) = payable(escrow.agent).call{value: agentPayout}("");
            require(sentAgent, "Agent payment failed");

            if (fee > 0) {
                (bool sentOwner, ) = payable(owner).call{value: fee}("");
                require(sentOwner, "Fee payment failed");
            }

            emit FundsReleased(_escrowId, escrow.agent, agentPayout);
        } else {
            escrow.status = EscrowStatus.Refunded;

            (bool sent, ) = payable(escrow.client).call{value: escrow.amount}("");
            require(sent, "Refund failed");

            emit FundsRefunded(_escrowId, escrow.client, escrow.amount);
        }
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee too high");
        platformFeePercent = _newFee;
    }

    function getEscrow(uint256 _escrowId) external view returns (Escrow memory) {
        return escrows[_escrowId];
    }

    function getEscrowByTask(string calldata _taskId) external view returns (Escrow memory) {
        uint256 escrowId = taskToEscrow[_taskId];
        require(escrowId != 0, "No escrow for task");
        return escrows[escrowId];
    }
}
