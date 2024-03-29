const { Group } = require('../../models/Group');
const { User } = require('../../models/User');

const process = {
  // 그룹 만들기
  create: (req, res) => {
    // 그룹이름 중복 여부 확인
    Group.findOne({ name: req.body.name }, (err, name) => {
      if (err) return res.json({ createSuccess: false, err });
      if (name)
        return res.status(409).json({
          createSuccess: false,
          message: '이미 사용중인 그룹 이름입니다.',
        });
      const group = new Group(req.body);
      // 새로운 그룹 정보 DB에 저장
      group.save((err, group) => {
        if (err) return res.json({ createSuccess: false, err });
        // 그룹 어드민 목록에 해당 유저 추가
        Group.findOneAndUpdate(
          { name: group.name },
          { $addToSet: { admins: req.user._id } },
          (err, group) => {
            if (err) return res.json({ createSuccess: false, err });
            // 유저 그룹 목록에 해당 그룹 추가
            User.findOneAndUpdate(
              { _id: req.user._id },
              { $addToSet: { groupList: group._id } },
              (err, user) => {
                if (err) {
                  return res.status(500).json({ createSuccess: false });
                }
                return res.status(200).json({ createSuccess: true });
              },
            );
          },
        );
      });
    });
  },

  // 그룹에 참가
  join: async (req, res) => {
    // 존재하는 그룹인지 확인
    const group = await Group.findByName(req.body.name);
    if (!group)
      return res
        .status(409)
        .json({ joinSuccess: false, message: '존재하지 않는 그룹입니다.' });

    // 가입한 그룹인지 확인
    for (let i = 0; i < group.members.length; i++) {
      if (String(group.members[i]) === String(req.user._id))
        return res.status(409).json({
          joinSuccess: false,
          message: '이미 해당 그룹에 가입하였습니다.',
        });
    }

    // 새로운 유저 그룹 멤버 목록에 추가
    Group.findOneAndUpdate(
      { name: req.body.name },
      { $addToSet: { members: req.user._id } },
      (err, group) => {
        if (err) {
          return res.status(500).json({ joinSuccess: false });
        }
        // 유저 그룹 목록에 해당 그룹 추가
        User.findOneAndUpdate(
          { _id: req.user._id },
          { $addToSet: { groupList: group._id } },
          (err, user) => {
            if (err) {
              return res.status(500).json({ joinSuccess: false });
            }
            return res.status(200).json({ joinSuccess: true });
          },
        );
      },
    );
  },

  // 그룹 검색
  search: async (req, res) => {
    const result = await Group.find(
      {
        // 일치하는 패턴 중 최초 등장하는 패턴 한 번만 찾음
        name: new RegExp(req.body.searchGroup),
      },
      { name: 1 },
    ).limit(20);
    if (!result.length)
      return res.status(200).json({ message: '검색 결과가 없습니다.' });
    return res.status(200).json(result);
  },
};

module.exports = {
  process,
};
